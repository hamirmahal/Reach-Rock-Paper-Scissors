import { ask } from '@reach-sh/stdlib/ask.mjs';
import { loadStdlib } from '@reach-sh/stdlib';
import * as backend from './build/index.MAIN.mjs';
const STANDARD_LIBRARY = loadStdlib(process.env);

const THE_USER_IS_PLAYING_AS_AISHA = await ask.ask(
    'Are you Aisha?', ask.yesno
);
const PLAYER = THE_USER_IS_PLAYING_AS_AISHA ?
    'Aisha' : 'Bem';

console.info(`Starting Rock, Paper, Scissors as ${PLAYER}`);

let newAccount = null;

const WE_ARE_CREATING_AN_ACCOUNT = await ask.ask(
    'Would you like to create an account? ' +
    'This is only possible on "devnet".',
    ask.yesno
);

if (WE_ARE_CREATING_AN_ACCOUNT)
    newAccount = await STANDARD_LIBRARY.newTestAccount(
        STANDARD_LIBRARY.parseCurrency(1000)
    );
else {
    const secret = await ask.ask(
        'What is your account secret?',
        x => x
    );
    newAccount = await STANDARD_LIBRARY.newAccountFromSecret(
        secret
    );
}

let contract = null;

if (THE_USER_IS_PLAYING_AS_AISHA) {
    contract = newAccount.contract(backend);
    contract.getInfo().then(console.info);
} else {
    const info = await ask.ask(
        'What is the contract information?', JSON.parse
    );
    contract = newAccount.contract(backend, info);
}

/**
 * @param {number} x
 */
const FORMAT = x => STANDARD_LIBRARY.formatCurrency(x, 4);

const GET_PLAYERS_BALANCE = async () => FORMAT(
    await STANDARD_LIBRARY.balanceOf(newAccount)
);

const INITIAL_BALANCE = await GET_PLAYERS_BALANCE();
console.info(INITIAL_BALANCE);

const INTERACT_OBJECT = { ...STANDARD_LIBRARY.hasRandom };

INTERACT_OBJECT.informTimeout = () => {
    console.info('There was a timeout!');
    process.exit(1);
};

if (THE_USER_IS_PLAYING_AS_AISHA) {
    const wagerAmount = await ask.ask(
        'How much do you want to wager?',
        STANDARD_LIBRARY.parseCurrency
    );
    INTERACT_OBJECT.wager = wagerAmount;
    INTERACT_OBJECT.deadline = {
        ETH: 100, ALGO: 100, CFX: 1000
    }[STANDARD_LIBRARY.connector];
}
else
    INTERACT_OBJECT.acceptWager = async amount => {
        const playerAccepted = await ask.ask(
            `Do you accept the wager of ${FORMAT(amount)}?`,
            ask.yesno
        );
        if (!playerAccepted) process.exit(0);
    };

const POSSIBLE_HAND = [ 'rock', 'paper', 'scissors' ];
const HANDS = {
    'Rock': 0, 'R': 0, 'r': 0,
    'Paper': 1, 'P': 1, 'p': 1,
    'Scissors': 2, 'S': 2, 's': 2
};

INTERACT_OBJECT.getHand = async () => {
    const hand = await ask.ask('What hand will you play?', x => {
        const hand = HANDS[x];

        if (hand === undefined)
            throw new Error(
                hand + ' is not a valid hand!'
            );

        return hand;
    });
    console.log('You played ' + POSSIBLE_HAND[hand] + '!');
    return hand;
};

const OUTCOME = [ 'Bem wins!', 'a draw!', 'Aisha wins!' ];
INTERACT_OBJECT.seeOutcome = async outcome =>
    console.info('The outcome is...', OUTCOME[outcome]);;

const part = THE_USER_IS_PLAYING_AS_AISHA ?
    contract.p.Aisha : contract.p.Bem;
await part(INTERACT_OBJECT);

const ENDING_BALANCE = await GET_PLAYERS_BALANCE();
console.info('Current balance:', ENDING_BALANCE);

ask.done();
