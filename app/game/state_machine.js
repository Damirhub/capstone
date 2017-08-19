// TODO: Move elements of game.js in to state_machine

var logger  = require('winston');
var Game    = require('./game.js');
var Data_package    = require('../data_api/data_package.js');
var Game_state      = require('../data_api/game_state.js');
var Player          = require('../data_api/player.js');
var Action          = require('../data_api/action.js');
var Cards           = require('../data_api/cards.js');
/*
*  The core of the server side
*
*  This is the state machine that handles;
*   - incoming connections
*   - assigning and starting games
*   - iteration of each games gameplay
*   - end game
*/

/*
draft states:
    setup
    trade
    round
    end
*/

/*******************************************************
* The state machine structure and logic
*******************************************************/

/// The state machine contains the Game and operates on it
/// One state machine per game
function StateMachine(id) {
    this.id = id;
    this.game = new Game(this);
    this.state = "setup"; // starting state, states are ref by string for readability
    this.setupComplete = false;
    this.setupSequence = [0,1,1,0];
    this.setupPointer = 0;
}

/// Only called to create a new game
StateMachine.prototype.create = function() {
    this.games.push(new Game(this));
};

/// Iterates through states according to flags set
/// for example; setup_complete = true would skip that state
/// or return false on check_win_condition would skip the
/// finish (game_end) state
StateMachine.prototype.next_state = function() {
    // TODO: checks on game conditions to determine state
    if (state === "setup") {
        // if (conditions to switch state)
        if(this.setupComplete)
            this.state = "trade";

    } else if (state === "trade") {
        // if (conditions to switch state)
        // eg: if (this.trade_complete) this.state = "play"

    } else if (state === "play") {
        // if (conditions to switch state)
        // eg: if (this.game.is_won()) this.state = "end_game"
        //     else if (this.round_finished) this.state = "trade"

    } else if (state === "end_game") {
        // if (conditions to switch state)
    }
}

/***************************************************************
* This is where the actual state logic lives
*
* NOTE: For each incoming player request, this ticks over
*       which means that tracking how many player requests have
*       come in is of use per state
****************************************************************/
StateMachine.prototype.tick = function(data) {
    /************************************************************
    * If in Setup state - game setup logic operates on this.game
    ************************************************************/
    if (this.state === "setup") {
        //logger.log('debug', 'Player '+data.player_id+' has tried to place a settlement.');
        //distribute resources from the second round settlement placement
        if(this.setupPointer > this.setupSequence / 2){
            //this.second_round_resources(data);
        }
        //call start sequence again from here - startSequence will find the next player to have a turn
        this.game_start_sequence();

        // For now: increment round number and reset the player turn
        // completion status
        this.game.players.forEach(function(player) {
            player.turn_complete = false;
        });

        for(var i = 0;  i < this.game.players.length; i++){
            // In normal play, all players should return true, in setup phase only one will
            if(this.game.players[i].turn_complete){
                //add player data to player object
            }
        }

        this.game.round_num = this.round_num + 1;
        return true;
    }

    /************************************************************
    * If in Trade state - trade logic operates on this.game
    ************************************************************/
    else if (this.state === "trade") {
        return true;
    }

    /************************************************************
    * If in Play state - gameplay logic opperates on this.game
    ************************************************************/
    else if (this.state === "play") {
        // Handle standard gameplay rounds
        this.game.players[data.player_id].turn_complete = true;
        this.game.players[data.player_id].turn_data = data;

        // Determine if the round is complete, ie. all players have
        // indicated their round is complete
        var round_complete = this.game.players.every(function(player) {
            return player.turn_complete === true;
        });

        for(var i = 0;  i < this.game.players.length; i++){
            // In normal play, all players should return true, in setup phase only one will
            if(this.players[i].turn_complete){
                //add player data to player object
            }
        }
        return true;
    }

    /************************************************************
    * If in end_game state - gameplay logic opperates on this.game
    ************************************************************/
    else if (this.state === "end_game") {
        return true;
    }
    this.next_state();
    return false;
}

/*****************************************************************
 Gathers up the state of the game and sends the current gamestate
 to all the players contains all data to render the current state
 of the game in the browser
******************************************************************/
StateMachine.prototype.broadcast_gamestate = function() {
    var players = this.game.players.map(function(player, idx) {
        return {
            id              : idx,
            name            : player.name,
            turn_complete   : player.turn_complete
        };
    });

    var game_data = {
        players   : players,
        round_num : this.game.round_num
    };

    this.broadcast('update_game', game_data);
};

/// Messages all players in a game
StateMachine.prototype.broadcast = function(event_name, data) {
    console.log('Broadcasting event: ' + event_name);
    this.game.players.forEach(function(player) {
        player.socket.emit(event_name, data);
    });
};

/***************************************************************
* Start Sequence
***************************************************************/
StateMachine.prototype.game_start_sequence = function(setup_data){
    console.log('game_start_sequence Called');
    logger.log('debug', 'game_start_sequence function called.');

    //Create data package for setup phase
    var setup_data = new Data_package();
    setup_data.data_type = 'setup_phase';

    if(this.setupPointer < this.setupSequence.length){

        // send all players except one a wait command
        for (var i = 0; i < this.game.players.length; i++){

            if(i !== this.setupSequence[this.setupPointer]){

                //not this player's turn to place a settlement and road
                setup_data.player = 0;
                logger.log('debug', 'Send data for player to wait');
                this.game.players[i].socket.emit('game_turn', setup_data);
            } else {

                //this player's turn to place a settlement and road (1=first place, 2 = 2nd placement)
                if(this.setupPointer < this.setupSequence.length / 2){
                    setup_data.player = 1;
                } else {
                    console.log("Set to 2");
                    setup_data.player = 2;
                }

                this.game.players[i].socket.emit('game_turn', setup_data);

            }
        }
    } else {
        this.setupComplete = true;
        console.log("Setup complete");
        logger.log('debug', 'Setup phase completed');
        setup_data.data_type = 'setup_complete';
        this.broadcast('game_turn', setup_data);
    }
    this.setupPointer++;
}

module.exports = { StateMachine };
