import test from 'ava';
var webdriverio = require('webdriverio');
var SauceLabs = require("saucelabs");
var username = "sumnerfit";
var accessKey = "e8a11001-6685-43c4-901b-042e862a93f4";
var saucelabs = new SauceLabs({
  username: username,
  password: accessKey
});

var superQuickTests = {
    'Windows 10': {
      'firefox': {
        startVersion: 54,
        endVersion: 55
      },
      'screenResolution' : '1280x1024'
    }
  }

var quickTests = {
  'Windows 10': {
    'firefox': {
      startVersion: 55,
      endVersion: 55
    },
    'chrome': {
      startVersion: 60,
      endVersion: 60
    },
    'internet explorer': {
      startVersion: 11,
      endVersion: 11
    },
    'MicrosoftEdge': { //testing two versions here
      startVersion: 14,
      endVersion: 15
    },
  },
  'Windows 8.1': {
    'firefox': {
      startVersion: 55,
      endVersion: 55
    },
    'internet explorer': {
      startVersion: 11,
      endVersion: 11
    }
  },
  'Linux': {
    'firefox': {
      startVersion: 45,
      endVersion: 45
    },
    'chrome': {
      startVersion: 48,
      endVersion: 48
    }
  },
  'Mac 10.12': {
    'firefox': {
      startVersion: 45,
      endVersion: 45
    },
    'chrome': {
      startVersion: 60,
      endVersion: 60
    },
    'safari': {
      startVersion: 10,
      endVersion: 10
    }
  }
}

var testCapabilities = quickTests;

var browserArray = [];
var arrayPointer = 0;

// Loop each Operating System
for (var os in testCapabilities) {

  //Loop through each Browser on that Operating System
  for (var browser in testCapabilities[os]) {

    // Loop through each version specified for that Browser
    for (var version = parseInt(testCapabilities[os][browser].startVersion); version <= parseInt(
        testCapabilities[os][browser].endVersion); version++) {

        browserArray.push({os:os, browser:browser, version:version})
    }
  }
}
var counter = 0;
function popups_display_and_close(){
  var browser = browserArray[arrayPointer].browser;
  var os = browserArray[arrayPointer].os;
  var version = browserArray[arrayPointer].version;
  var testsRun = counter;
  if (counter % 2 !== 0){
    arrayPointer++;
  }
  counter++;
  
  var player_name = browser + " " +version+"-"+(testsRun % 2);
  var other_player= browser + " " +version+"-"+(testsRun+1) % 2;
  var testTitle = player_name + "|"+browser+"|"+os+"|"+version
  var passedBool = false;
}
function setupDriver(browser, version, os, testTitle){
  return webdriverio.multiremote({
    browserA: {
    desiredCapabilities: {
      browserName: browser,
      version: version,
      platform: os,
      tags: ['examples'],
      name: testTitle,
      screenResolution: "1024x768",

      // If using Open Sauce (https://saucelabs.com/opensauce/),
      // capabilities must be tagged as "public" for the jobs's status
      // to update (failed/passed). If omitted on Open Sauce, the job's
      // status will only be marked "Finished." This property can be
      // be omitted for commerical (private) Sauce Labs accounts.
      // Also see https://support.saucelabs.com/customer/portal/articles/2005331-why-do-my-tests-say-%22finished%22-instead-of-%22passed%22-or-%22failed%22-how-do-i-set-the-status-
      'public': true
    }},
    browserB:{
     desiredCapabilities: {
      browserName: browser,
      version: version,
      platform: os,
      tags: ['examples'],
      name: testTitle,
      screenResolution: "1024x768",

      // If using Open Sauce (https://saucelabs.com/opensauce/),
      // capabilities must be tagged as "public" for the jobs's status
      // to update (failed/passed). If omitted on Open Sauce, the job's
      // status will only be marked "Finished." This property can be
      // be omitted for commerical (private) Sauce Labs accounts.
      // Also see https://support.saucelabs.com/customer/portal/articles/2005331-why-do-my-tests-say-%22finished%22-instead-of-%22passed%22-or-%22failed%22-how-do-i-set-the-status-
      'public': true
    } 
    },
    host: 'ondemand.saucelabs.com',
    port: 80,
    user: username,
    key: accessKey,
    logLevel: 'silent'
  });
}

  test('Game tests', async t => {
    for(var i = 0; i < browserArray.length; i++){
       var player_name = browserArray[arrayPointer].browser + " " +browserArray[arrayPointer].version+"-"+(i % 2);
      var other_player= browserArray[arrayPointer].browser + " " +browserArray[arrayPointer].version+"-"+(i+1) % 2;
      var testTitle = browserArray[arrayPointer].browser+"|"+browserArray[arrayPointer].os+"|"+browserArray[arrayPointer].version;
      var client = setupDriver(browserArray[arrayPointer].browser, browserArray[arrayPointer].os, browserArray[arrayPointer].version, testTitle);
     
      arrayPointer++;
    await client.init()
      client.browserB.url('http://capstone-settlers.herokuapp.com/?startWithCards=3&setup=skip&fixedDice=true&dev_card=road_building')
      .click('#play')
      .setValue('#player-input', player_name )
      .click('#start-game').then(function(){
        if(i % 2 === 0){
          return client.click('#start-2-players')
            .getTitle()
            .then(result => {
              t.is(result, "Settlers of Massey");
            }).end();
        }else{
          return client.waitForVisible('.game_list_row_title='+other_player+'\'s Game',10000)
            .click('.game_list_row_title='+other_player+'\'s Game' )
            .waitForVisible('#begin-round',10000)
            .click("#begin-round")
            .waitForVisible('#begin-round-btn',10000)
            .click("#begin-round-btn")
            .waitForVisible('.buybutton',10000)
            .click('.buybutton')
            .elements('.cardlist').then(function (cardlist) {
              t.is(cardlist.value.length, 1);
            })
            .click('.road_building')
            .waitForVisible('.btn-large',10000)
            .getText('.popup_subtitle')
            .then(function (elements){
              console.log(elements);
              t.is(elements, "Card cannot be played.");
            })
            .click(".btn-large")
            .click(".other_player0_cell")
            .getText('.player_score')
            .then(function (elements){
              console.log(elements);
              t.is(elements, "0 Victory Points!");
            })
            .click(".btn-large")
            .setValue('.chat_input', "Testing chat\uE007")
            .getText('.chat_message')
            .then(function (elements){
              console.log(elements);
              t.is(elements, player_name + " Testing chat");
            }).then(function(){
              console.log("this gets called but the next one doesn't");
            })
            .end();
      }
    })
    }
  })


async function runTests(){
    await popups_display_and_close();
    popups_display_and_close();
    console.log('2 tests run');
}

runTests();
