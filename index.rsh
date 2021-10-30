'reach 0.1';

const [IS_HAND, ROCK, PAPER, SCISSORS] = makeEnum(3);
const [IS_OUTCOME, BOB_WINS, DRAW, ALICE_WINS] = makeEnum(3);

const WINNER = (ALICES_HAND, BOBS_HAND) => (
	ALICES_HAND + (4 - BOBS_HAND)
) % 3;

assert(WINNER(ROCK, PAPER) == BOB_WINS);
assert(WINNER(PAPER, ROCK) == ALICE_WINS);
assert(WINNER(ROCK, ROCK) == DRAW);

forall(UInt, ALICES_HAND =>
	forall(UInt, BOBS_HAND =>
		assert(
			IS_OUTCOME(
				WINNER(ALICES_HAND, BOBS_HAND)
			)
		)
	)
);

forall(UInt, hand =>
	assert(
		WINNER(hand, hand) == DRAW
	)
);

const PLAYER = {
	...hasRandom,
	getHand: Fun([], UInt),
	seeOutcome: Fun([UInt], Null),
	informTimeout: Fun([], Null),
};

export const MAIN = Reach.App(() => {
	const ALICE = Participant('Alice', {
		...PLAYER,
		deadline: UInt,
		wager: UInt,
	});
	const BOB = Participant('Bob', {
		...PLAYER,
		acceptWager: Fun([UInt], Null),
	});
	deploy();

	const informTimeout = () =>
		each(
			[Alice, Bob], () => interact.informTimeout()
		);

	ALICE.only(() => {
		const _ALICES_HAND = interact.getHand();
		const WAGER = declassify(interact.wager);
		const [_ALICES_COMMIT, _ALICES_SALT] = makeCommitment(
			interact, _ALICES_HAND
		);
		const ALICES_COMMIT = declassify(_ALICES_COMMIT);
	});
	ALICE.publish(WAGER, ALICES_COMMIT).pay(WAGER);
	commit();

	unknowable(BOB, ALICE(_ALICES_HAND, _ALICES_SALT));
	BOB.only(() => {
		interact.acceptWager(WAGER);
		const BOBS_HAND = declassify(interact.getHand());
	});
	BOB.publish(BOBS_HAND).pay(WAGER);
	commit();

	ALICE.only(() => {
		const ALICES_HAND = declassify(_ALICES_HAND);
		const ALICES_SALT = declassify(_ALICES_SALT);
	});
	ALICE.publish(ALICES_HAND, ALICES_SALT);
	checkCommitment(ALICES_COMMIT, ALICES_SALT, ALICES_HAND);

	const OUTCOME = WINNER(ALICES_HAND, BOBS_HAND);
	const [ALICES_PAYOUT, BOBS_PAYOUT] =
		OUTCOME === ALICE_WINS ? [2, 0] :
			OUTCOME === BOB_WINS ? [0, 2] :
				[1, 1];
	transfer(ALICES_PAYOUT * WAGER).to(ALICE);
	transfer(BOBS_PAYOUT * WAGER).to(BOB);
	commit();

	each([ALICE, BOB], () => {
		interact.seeOutcome(OUTCOME);
	});
});