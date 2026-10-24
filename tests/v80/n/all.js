// Version 8.0 Track N: messages, placing and the lesson fixes (rulings 1160-1174). Describe names start with 'v80 n', so tests/run-tests.ps1 -Grep "v80 n" runs them all.
import './tray.test.js';      // the message tray behind the scroll button
import './placing.test.js';   // the bar says what is in hand, one primary, one tap one plot
import './undo.test.js';      // Undo covers the last action until the next month
import './lesson.test.js';    // the view follows the step, the pulse, Leave in the menu
