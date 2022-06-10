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
  const ALICE = Participant('Aisha', {
    ...PLAYER,
    deadline: UInt,
    wager: UInt,
  });
  const BOB = Participant('Bem', {
    ...PLAYER,
    acceptWager: Fun([UInt], Null),
  });
  deploy();

  const informTimeout = () =>
    each(
      [ALICE, BOB], () => interact.informTimeout()
    );

  ALICE.only(() => {
    const WAGER = declassify(interact.wager);
    const DEADLINE = declassify(interact.deadline);
  });
  ALICE.publish(WAGER, DEADLINE).pay(WAGER);
  commit();

  BOB.only(() => interact.acceptWager(WAGER));
  BOB.pay(WAGER).timeout(
    relativeTime(DEADLINE),
    () => closeTo(ALICE, informTimeout)
  );

  var outcome = DRAW;
  invariant(
    balance() == 2 * WAGER && IS_OUTCOME(outcome)
  );
  while (outcome == DRAW) {
    commit();

    ALICE.only(() => {
      const _ALICES_HAND = interact.getHand();
      const [
        _ALICES_COMMIT,
        _ALICES_SALT
      ] = makeCommitment(
        interact, _ALICES_HAND
      );
      const ALICES_COMMIT = declassify(_ALICES_COMMIT);
    });
    ALICE.publish(ALICES_COMMIT).timeout(
      relativeTime(DEADLINE),
      () => closeTo(BOB, informTimeout)
    );
    commit();

    unknowable(BOB, ALICE(_ALICES_HAND, _ALICES_SALT));
    BOB.only(() => {
      const BOBS_HAND = declassify(interact.getHand());
    });
    BOB.publish(BOBS_HAND).timeout(
      relativeTime(DEADLINE),
      () => closeTo(ALICE, informTimeout)
    );
    commit();

    ALICE.only(() => {
      const ALICES_SALT = declassify(_ALICES_SALT);
      const ALICES_HAND = declassify(_ALICES_HAND);
    });
    ALICE.publish(ALICES_SALT, ALICES_HAND).timeout(
      relativeTime(DEADLINE),
      () => closeTo(BOB, informTimeout)
    );
    checkCommitment(
      ALICES_COMMIT, ALICES_SALT, ALICES_HAND
    );

    outcome = WINNER(ALICES_HAND, BOBS_HAND);
    continue;
  }

  assert(
    outcome === ALICE_WINS || outcome === BOB_WINS
  );
  transfer(2 * WAGER).to(
    outcome === ALICE_WINS ? ALICE : BOB
  );
  commit();

  each([ALICE, BOB], () =>
    interact.seeOutcome(outcome)
  );
});
