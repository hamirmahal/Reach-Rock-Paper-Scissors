import { loadStdlib } from '@reach-sh/stdlib';
import * as backend from './build/index.MAIN.mjs';
const STANDARD_LIBRARY = loadStdlib(process.env);

(async () => {
  const INITIAL_BALANCE = STANDARD_LIBRARY.parseCurrency(10);
  const ALICES_ACCOUNT = await STANDARD_LIBRARY.newTestAccount(INITIAL_BALANCE);
  const BOBS_ACCOUNT = await STANDARD_LIBRARY.newTestAccount(INITIAL_BALANCE);

  const FORMAT = x => STANDARD_LIBRARY.formatCurrency(x, 4);
  const GET_BALANCE_OF = async account => FORMAT(
    await STANDARD_LIBRARY.balanceOf(account)
  );
  const ALICES_INITIAL_BALANCE = await GET_BALANCE_OF(ALICES_ACCOUNT);
  const BOBS_INITIAL_BALANCE = await GET_BALANCE_OF(BOBS_ACCOUNT);
  const ctcAlice = ALICES_ACCOUNT.contract(backend);
  const ctcBob = BOBS_ACCOUNT.contract(backend, ctcAlice.getInfo());

  const HAND = ['Rock', 'Paper', 'Scissors'];
  const OUTCOME = ['Bob wins', 'Draw', 'Alice wins'];
  const PLAYER = person => ({
    ...STANDARD_LIBRARY.hasRandom,
    getHand: async () => {
      const HAND_INDEX = Math.floor(Math.random() * 3);
      console.log(`${person} played ${HAND[HAND_INDEX]}`);
      if ( Math.random() <= 0.01 ) {
        for ( let i = 0; i < 10; i++ ) {
          console.log(`  ${PLAYER} takes awhile...`);
          await STANDARD_LIBRARY.wait(1);
        }
      }
      return HAND_INDEX;
    },
    informTimeout: () => console.log(`${person} observed a timeout.`),
    seeOutcome: outcome =>
      console.log(`${person} saw outcome ${OUTCOME[outcome]}`),
  });

  await Promise.all([
    ctcAlice.p.Alice({
      ...PLAYER('Alice'),
      deadline: 10,
      wager: STANDARD_LIBRARY.parseCurrency(9)
    }),
    ctcBob.p.Bob({
      ...PLAYER('Bob'),
      acceptWager: async (amount) => {
        console.log(
          `Bob accepts the wager of ${
            FORMAT(amount)
          }.`
        );
      },
    }),
  ]);

  const ALICES_ENDING_BALANCE = await GET_BALANCE_OF(ALICES_ACCOUNT);
  const BOBS_ENDING_BALANCE = await GET_BALANCE_OF(BOBS_ACCOUNT);

  console.log(
    `Alice went from ${ALICES_INITIAL_BALANCE} to ${ALICES_ENDING_BALANCE}.`
  );
  console.log(
    `Bob went from ${BOBS_INITIAL_BALANCE} to ${BOBS_ENDING_BALANCE}.`
  );
})();