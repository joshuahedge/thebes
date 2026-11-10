// Version 9.3 Track K, the weekly decree's balance (rulings 1985-1989): describe names start with 'v93 k'.
// The balance runs (decrees.test.js: fourteen six-year Capitals) take minutes, so they stay out of the default suite and out of -Grep "v93"; they load only
// when the grep asks for them: tests/run-tests.ps1 -Grep "v93 k balance" -WaitSeconds 3600 (ruling 1985).
const grep = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('grep') || '' : '';
if (grep.includes('v93 k balance')) await import('./decrees.test.js');
