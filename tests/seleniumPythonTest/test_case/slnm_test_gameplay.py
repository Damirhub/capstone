__author__ = 'Craig Walker'

import sys
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from sauceclient import SauceClient
from multiprocessing import Pool
from selenium.webdriver.common.action_chains import ActionChains
import unittest

USERNAME = "sumnerfit"
ACCESS_KEY = "e8a11001-6685-43c4-901b-042e862a93f4"
sauce = SauceClient(USERNAME, ACCESS_KEY)
arrayPointer = 0
desired_caps = [
        {'browserName':'firefox',
        'platform':'Windows 10',
        'screenResolution' : '1280x1024',
        'name': 'Windows 10 - Firefox',
        'screenResolution' : '1280x1024',
        'version': '54.0',},
        { 'browserName':'firefox',
        'platform':'Linux',
        'name': 'Linux - Firefox',
        'screenResolution' : '1024x768',
        'version': '45.0',},
        {'browserName':'chrome',
        'platform':'Windows 10',
        'name': 'Windows 10 - Chrome',
        'screenResolution' : '1280x1024',
        'version': '60.0',},
        {'browserName':'internet explorer',
        'platform':'Windows 10',
        'name': 'Windows 10 - Internet Explorer',
        'screenResolution' : '1280x1024',
        'version': '11',},
        {'browserName':'microsoftedge',
        'platform':'Windows 10',
        'name': 'Windows 10 - Microsoft Edge',
        'screenResolution' : '1280x1024',
        'version': '15',},
        {'browserName':'firefox',
        'name': 'MacOS 10.12 - Firefox',
        'screenResolution' : '1024x768',
        'platform':'Mac 10.12',
        'version': '54.0',}]

def get_desired_cap(desired_cap):
  USERNAME = "sumnerfit"
  ACCESS_KEY = "e8a11001-6685-43c4-901b-042e862a93f4"
  driver = webdriver.Remote(
     command_executor = 'http://'+USERNAME+':'+ACCESS_KEY+'@ondemand.saucelabs.com:80/wd/hub',
     desired_capabilities = desired_cap)
  return driver

def buy_dev_card():
  try:
    global arrayPointer

    print "set driver"
    driverA = get_desired_cap(desired_caps[arrayPointer])
    driverB = get_desired_cap(desired_caps[arrayPointer])

    # wait=WebDriverWait(driver,10)

    # load website
    print "load website"
    driverA.get("https://capstone-settlers.herokuapp.com/?startWithCards=2&setup=skip&dev_card=road_building")
    driverB.get("https://capstone-settlers.herokuapp.com/?startWithCards=2&setup=skip&dev_card=road_building")
    # driver.implicitly_wait(10)

    # click play button
    print "click play button"

    driverA.find_element_by_id('play').click()
    driverB.find_element_by_id('play').click()

    print "start up first player"
    # add name to input
    playerInput = driverA.find_element_by_id('player-input')
    playerInput.send_keys(desired_caps[arrayPointer]['browserName']+"-"+desired_caps[arrayPointer]['version']+"-p1")
    start_game = driverA.find_element_by_id('start-game')
    start_game.click()
    driverA.find_element_by_id('start-2-players').click()

    print "second player to join"
    playerInput = driverB.find_element_by_id('player-input')
    playerInput.send_keys("player 2")

    print "p2 click game button"
    start_game = driverB.find_element_by_id('start-game')
    start_game.click()

    print "click game start"
    driverB.implicitly_wait(10)

    gameString = desired_caps[arrayPointer]["browserName"]+ "-" +desired_caps[arrayPointer]["version"]
    print gameString
    game_to_start = driverB.find_element_by_xpath('//div[contains(text(), "' + gameString + '-p1\'s Game")]')
    game_to_start.click()

    driverA.implicitly_wait(5)
    driverB.implicitly_wait(5)
    driverA.find_element_by_id('begin-round').click()
    driverB.find_element_by_id('begin-round').click()

    driverA.implicitly_wait(1)
    driverB.implicitly_wait(1)
    driverA.find_element_by_id('begin-round-btn').click()
    driverB.find_element_by_id('begin-round-btn').click()

    buybutton = driverA.find_elements_by_class_name('buybutton')
    buybutton[0].click()

    road_building = driverA.find_elements_by_class_name('road_building')
    road_building[0].click()
    road_building_close = driverA.find_elements_by_class_name('btn-large')
    road_building_close[0].click()

    player_scores_open = driverA.find_elements_by_class_name('other_player_cell')
    player_scores_open[0].click()
    player_scores_close = driverA.find_elements_by_class_name('btn-large')
    player_scores_close[0].click()

    chat_input_A =  driverA.find_elements_by_class_name('chat_input')
    chat_input_A[0].send_keys("Testing Chat")
    chat_input_A[0].send_keys(u'\ue007')
    chat_message_A =  driverA.find_elements_by_class_name('chat_message')
    chat_message_B =  driverA.find_elements_by_class_name('chat_message')

    finish_testing(driverA)
    finish_testing(driverB)
    arrayPointer = arrayPointer + 1
    buy_dev_card()

  except:
    sauce.jobs.update_job(driverA.session_id, passed=False)
    sauce.jobs.update_job(driverB.session_id, passed=False)
    print "Test failed, sessionId: %s" %driverA.session_id

def finish_testing(driver):
  print "Link to your job: https://saucelabs.com/jobs/%s" % driver.session_id
  try:
    if sys.exc_info() == (None, None, None):
        sauce.jobs.update_job(driver.session_id, passed=True)
        print "Test passed, sessionId: %s" %driver.session_id
    else:
      sauce.jobs.update_job(driver.session_id, passed=False)
      print "Test failed, sessionId: %s" %driver.session_id
  finally:
    driver.quit()

buy_dev_card()