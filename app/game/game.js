var logger = require('winston');
var board_builder = require('./board_builder.js');
var Shuffler = require('../helpers/shuffler.js');
var {
  Cards,
  TradeCards
} = require('../../public/data_api/cards.js');

function Game() {
  var standard_board = [
    ["z0", "z0", "z0", "z0", "z0", "z0", "z0"],
    ["z0", "z0", "e11", "b12", "d9", "z0", "z0"],
    ["z0", "z0", "a4", "c6", "a5", "b10", "z0"],
    ["z0", "f0", "e3", "d11", "e4", "d8", "z0"],
    ["z0", "z0", "a8", "b10", "b9", "c3", "z0"],
    ["z0", "z0", "c5", "d2", "e6", "z0", "z0"],
    ["z0", "z0", "z0", "z0", "z0", "z0", "z0"]
  ];
  this.name = '';
  this.board = board_builder.generate();
  this.max_players = 4;
  this.WIN_SCORE = 10;
  this.players = [];
  this.round_num = 1;
  this.longest_road = 0;
  this.longest_road_id = -1;
  this.player_colours = ['purple', 'red', 'blue', 'green'];
  this.dice_roll = [];
  // Holds id of player with monopoly (-1 for no one holding card);
  this.monopoly = -1;
  // Indicates if a player has played the knight this round
  this.knight_player_id = -1;
  // set these variables via environment varaibles
  this.test_mode = 'false';
  this.robber = 'enabled';
  this.robber_frequency = 6;  //  # of 7s per round of 36 dice possibilities (6 max)
  this.cards = this.generate_dev_card_deck();
  this.dice_array = this.generate_dice_rolls();
  this.dice_array_pointer = 0;
}

/**
 * Returns bool if the game contains max players
 * @return {Bool} (this.players.length === this.max_players)
 */
Game.prototype.game_full = function () {
  return (this.players.length === this.max_players);
};

/**
 * Add the player object to this game
 * @param {Player} player
 * @return {Bool} - true if successful
 */
Game.prototype.add_player = function (player) {
  player.id = this.players.length;
  player.colour = this.player_colours[player.id];
  //  Send the player details
  player.socket.emit('player_id', {
    name: player.name,
    id: player.id,
    colour: player.colour
  });
  this.players.push(player);
  logger.log("info", 'Player number ' + (this.players.length) + ' has been added');
  return true;
};

Game.prototype.reset_player_turns = function () {
  this.players.forEach(function (player) {
    player.turn_complete = false;
  });
}

/**
 * Parse the board to JSON string
 * @return {String} JSON - this.board parsed to a JSON string
 */
Game.prototype.buildBoard = function () {
  jsonData = JSON.stringify(this.board);
  return jsonData;
};

/**
 *  Alocate starting resources based on the second settlement placement
 *  @param player : player object
 *  @param data   : Data package item
 */
Game.prototype.secondRoundResources = function (player, data) {
  var tiles;
  var i;
  var res_type;

  // find the settlement action
  for (i = 0; i < data.actions.length; i++) {
    if (data.actions[i].action_type === 'build_settlement') {
      tiles = data.actions[i].action_data.n_tiles;
    }
  }

  // Loop over each point and give the player one resource of each type
  // TODO: test with invalid data
  if (typeof tiles !== 'undefined') {
    for (i = 0; i < tiles.length; i++) {
      res_type = this.board.get_tile_resource_type(tiles[i]);
      player.cards.add_card(res_type);
    }
  } else {
    logger.log('debug', "secondRoundResources(): tiles undefined, possible invalid data");
  }
};

/**
 * Rolling two dices, and return the sum of the two dices number.
 * @return {Number} sum of the two dice
 */
// Game.prototype.rollingDice = function () {
//   var dice1 = 1 + Math.floor(Math.random() * 6);
//   var dice2 = 1 + Math.floor(Math.random() * 6);
//   this.dice_roll = [dice1, dice2];

//   // create fixed dice roll for testing -> constantly goes through dice values 5,6,7,8,9,10
//   if (this.test_mode === 'true') {
//     logger.log('debug', "Fixed dice rolls enabled");
//     var dice1array = [1, 2, 3, 4, 5, 6];
//     dice1 = dice1array[this.round_num % dice1array.length];

//     //to stop 7 being the first number and causing infinite loop
//     if (this.round_num === 2) {
//       dice1 = 4;
//     }
//     dice2 = 4;
//     this.dice_roll = [dice1, dice2];
//   }
//   return dice1 + dice2;
// };

/**
 * Allocate Diceroll Resources
 * @param roll {numner} : between 2 and 12
 * @return void
 */
Game.prototype.allocateDicerollResources = function (roll) {
  var i;
  var j;
  var k;
  var n;

  // Robber no resources to allocate
  if (roll === 7) return;
  var tiles = this.board.tiles;
  for (i = 0; i < tiles.length; i++) {
    var tiles_row = tiles[i];
    for (n = 0; n < tiles_row.length; n++) {
      // Robbed!! No resources for you
      if (tiles_row[n].robber) continue;
      // Find tile with token matching diceroll
      if (tiles_row[n].token == roll) {
        // Check the associated notes for structures
        var associated_nodes = tiles_row[n].associated_nodes;
        for (j = 0; j < associated_nodes.length; j++) {
          var node = this.board.nodes[associated_nodes[j]];
          // If we find build hand over resource cards to that player
          if (node.building !== '') {
            var player_id = node.owner;
            // settlements get 1 resource, cities 2
            var num_resources = (node.building === 'settlement') ? 1 : 2;
            var resource = tiles_row[n].type;
            // Send the tile resources to the player
            for (k = 0; k < num_resources; k++) {
              this.players[player_id].cards.add_card(resource);
              this.players[player_id].round_distribution_cards.add_card(resource);
            }
          }
        }
      }
    }
  }
};

// return a shuffled development card deck
Game.prototype.generate_dev_card_deck = function () {
  /**
   * create a way to generate / return cards
   * 14 Knights
   *  6 Progress cards
   *      + Road Building x 2
   *      + Year of Plenty x 2
   *      + Monopoly x 2
   *  5 Victory Point Cards
   *      + Library
   *      + Chapel
   *      + Great Hall
   *      + University of Catan
   *      + Market
   */
  var dev_cards = [];
  var action_cards = ['year_of_plenty', 'road_building', 'monopoly'];
  var vp_cards = ['library', 'chapel', 'great_hall', 'university_of_catan', 'market'];
  for (var i = 0; i < 14; i++) {
    dev_cards.push('knight');
    if (i < action_cards.length) {
      dev_cards.push(action_cards[i]);
      dev_cards.push(action_cards[i]);
    }
    if (i < vp_cards.length)
      dev_cards.push(vp_cards[i]);
  }

  var shuffler = new Shuffler();
  var cards = shuffler.shuffle(dev_cards);
  logger.log("debug", "Shuffled dev cards =\n", cards);
  return cards;
};

/**
 * Steal resources from each player
 * @return void
 */
Game.prototype.robPlayers = function () {
  var i;
  var j;
  var player;
  var num_cards;
  var player_cards;
  var num_to_steal;
  var shuffler = new Shuffler();

  // find us a victim
  let rand_idx = -1;
  do {
    rand_idx = Math.floor(Math.random() * this.players.length);
  } while (rand_idx === -1 && this.players[rand_idx].id === this.knight_player_id);
  let victim = this.players[rand_idx];
  logger.log('info', "Robber targetted player "+victim.name);

  let tiles = [];
  // going to assume players own at least one resource due to setup stage
  // TODO: this list will need to change for game expansions
  for (resource of ['sheep', 'brick', 'grain', 'ore', 'lumber']) {
    let owned_list = this.board.get_resource_owned_by(victim.id, resource);
    tiles = tiles.concat(owned_list);
  };

  if (tiles.length >= 1) {
    let tile = this.board.robberLocation;
    do {
      tile = tiles[Math.floor(Math.random() * tiles.length)]
    } while (tile === this.board.robberLocation);

    logger.log('info', "Robber targetted tile "+tile.type);
    // Remove the robber from current location before switching tile
    this.board.robberLocation.robber = false;
    this.board.robberLocation = tile;
    this.board.robberLocation.robber = true;

    let victim_cards = [];
    for (let card of Object.keys(victim.cards.resource_cards)) {
      if (victim.cards.count_single_card(card) >= 1)
        victim_cards.push(card);
    };
    let resource = victim_cards[Math.floor(Math.random() * victim_cards.length)];
    if (resource) {
      logger.log('info', "Robber stole "+resource);
      victim.cards.remove_card(resource);
      victim.round_distribution_cards.resource_cards[resource]--;
    } else {
      logger.log('debug', "Robber targetted a resource the victim didn't own?");
    }
  }

  // Work out what happens to each player
  for (i = 0; i < this.players.length; i++) {
    if (this.players[i].id !== this.knight_player_id) {
      player = this.players[i];
      num_cards = player.cards.count_cards();
      // If we're stealng some cards create an array of cards,
      // shuffle it then do the robbing
      if (num_cards > 7) {
        player_cards = [];

        for (resource in player.cards.resource_cards) {
          if (player.cards.resource_cards.hasOwnProperty(resource)) {
            var resource_count = player.cards.resource_cards[resource];
            for (j = 0; j < resource_count; j++) {
              player_cards.push(resource);
            }
          }
        }

        // Randomise the cards then start robbing...
        player_cards = shuffler.shuffle(player_cards);

        let num_to_steal = Math.floor(num_cards / 2);
        for (j = 0; j < num_to_steal; j++) {
          player.cards.remove_card(player_cards[j]);
          player.round_distribution_cards.resource_cards[player_cards[j]]--;
        }
      }
    }
  }
};

/**
 * Moves the robber after the knight card has been played
 * @param {Number} player_id : id of the player playing the knight
 */
Game.prototype.knightValidLocations = function (player_id) {
  var can_use;
  var possibleLocations = [];

  //  Iterate through all tiles
  for (var y = 0; y < this.board.tiles.length; y++) {
    for (var x = 0; x < this.board.tiles[y].length; x++) {
      can_use = true;
      if (this.board.tiles[y][x].type === 'water') {
        can_use = false;
      } else {
        // Find possible locations that we could move the robber to
        for (var j = 0; j < this.board.tiles[y][x].associated_nodes.length; j++) {
          // We can't block the player that played the knight
          var node = this.board.tiles[y][x].associated_nodes[j];
          if (node.owner === player_id) {
            can_use = false;
            break;
          }
        }
      }
      // Robber can't stay in the same place so exclude that location
      // If this is a tile we can rob add to array to pick from
      if (can_use && !this.board.tiles[y][x].robber) {
        possibleLocations.push([x,y]);
      }
    }
  }
  return possibleLocations;
};

Game.prototype.knight_rob_tile = function (player_id, loc) {
  let tile = this.board.tiles[loc[1]][loc[0]];
  // find a random player on the tile and nick off with a random card
  let player_ids = this.board.get_player_ids_on_tile(tile)
  let victim_id = -1;
  let resource = -1;
  if (player_ids.length >= 1) {
    let rand_idx = -1;
    do {
      rand_idx = Math.floor(Math.random() * player_ids.length);
    } while (rand_idx === -1 && player_ids[rand_idx] === player_id);
    let victim = this.players[player_ids[rand_idx]];
    victim_id = victim.id;

    let victim_cards = [];
    for (let card of Object.keys(victim.cards.resource_cards)) {
      if (victim.cards.count_single_card(card) >= 1)
        victim_cards.push(card);
    };
    if (victim_cards.length >= 1) {
      resource = victim_cards[Math.floor(Math.random() * victim_cards.length)];

      victim.cards.remove_multiple_cards(resource, 1); // TODO: use result?
      this.players[player_id].cards.add_cards(resource, 1);
      logger.log('info', 'player stole '+resource);
    } else {
      logger.log('info', 'victim had no cards to rob from');
    }
  } else {
    logger.log('info', 'player moved knight to a tile with no owners');
  }
  // Update player card details to reflect they have played a knight
  this.players[player_id].cards.dev_cards.knight_played++;
  this.players[player_id].cards.dev_cards.knight--;
  // Remove the robber from current location before switching tile
  this.board.robberLocation.robber = false;
  this.board.robberLocation = tile;
  this.board.robberLocation.robber = true;
  if (victim_id !== -1 && resource !== -1)
    return ({robbed:victim_id, resource:resource});
  return false;
};

Game.prototype.modifyPlayerWithRoadBonus = function () {
  var longest_road_map = this.board.longest_roads(this.players);
  var last_longest = this.longest_road;
  var last_player = this.longest_road_id;
  var do_longest_road = false;
  // check to see if players build any roads, otherwise skip checks
  for (var p = 0; p < this.players.length; p++) {
    var player = this.players[p];
    // update the players data
    player.score.road_length = longest_road_map.get(player.id);
    // only change game data IF a new longest road is found
    // is changed to first found longest road only.
    if (player.score.road_length > this.longest_road) {
      this.longest_road_id = player.id;
      this.longest_road = player.score.road_length;
    }
  }

  // figure out if two players have the same length road on this turn
  // and skip road score update if true, and reset game data for longest
  var skip_update = false;
  for (var p = 0; p < this.players.length; p++) {
    var player = this.players[p];
    if (player.score.road_length === this.longest_road && player.id !== this.longest_road_id) {
      skip_update = true;
      this.longest_road = last_longest;
      this.longest_road_id = last_player;
      logger.log('debug', "Players have same length road");
      break;
    }
  }

  if (skip_update === false) {
    for (var p = 0; p < this.players.length; p++) {
      var player = this.players[p];
      if (this.longest_road >= 5) {
        logger.log('info', "New player with longest road found:", player.id);
        player.score.longest_road =
          (this.longest_road_id === player.id) ? true : false;
      }
    }
  }
}

Game.prototype.modifyPlayerWithArmyBonus = function () {
  var largest_army = {
    player_id: -1,
    knights_played: 0,
    current_owner: -1 //check if a change of largest army owner
  }
  // first loop through gets last player with highest knights played + current bonus
  for (var p = 0; p < this.players.length; p++) {
    var player_id = this.players[p].id;
    if (this.players[p].score.largest_army)
      largest_army.current_owner = p;
    var knights_played = this.players[p].cards.dev_cards.knight_played;
    // Only look if player has played 3 or more knights
    if (knights_played >= 3 && knights_played > largest_army.knights_played) {
      largest_army.player_id = player_id;
      largest_army.knights_played = knights_played;
    }
  };

  for (var p = 0; p < this.players.length; p++) {
    var player_id = this.players[p].id;
    var knights_played = this.players[p].cards.dev_cards.knight_played;
    // if true then no player is awarded a bonus and no bonus is in play
    if (player_id !== largest_army.player_id &&
      knights_played === largest_army.knights_played &&
      largest_army.current_owner === -1) {
      largest_army.player_id = -1;
      break;
    }
    // if true then the last player in the loop gets the bonus
    else if (player_id !== largest_army.player_id &&
      knights_played === largest_army.knights_played &&
      player_id !== largest_army.current_owner) {
      largest_army.player_id = player_id;
    }
  }

  // check if we have someone eligable for largest army
  if (largest_army.player_id >= 0 && largest_army.knights_played >= 3) {
    //if player doesn't already has largest_army, add player
    if (!this.players[largest_army.player_id].score.largest_army) {
      this.players[largest_army.player_id].score.largest_army = true;
      //if someone already has the largest army, remove it from their hand.
      if (largest_army.current_owner !== -1) {
        this.players[largest_army.current_owner].score.largest_army = false;
      }
    }
  }
}

/**
 * Determines the player scores
 * @return void
 */
Game.prototype.calculateScores = function () {
  // Reset the score since we're recalculating it
  this.players.forEach(function (player) {
    player.score.settlements = 0;
    player.score.cities = 0;
    player.score.total_points = 0;
  }, this);

  // Count the buildings score
  this.board.nodes.forEach(function (node) {
    if (node.owner > -1) {
      // Score 1 point for each settlement and 2 points for each city
      if (node.building === 'settlement') {
        this.players[node.owner].score.settlements += 1;
        this.players[node.owner].score.total_points += 1;
      } else {
        this.players[node.owner].score.cities += 1;
        this.players[node.owner].score.total_points += 2;
      }
    }
  }, this);

  // Count VP Cards and Longest Rd, Biggest Army
  this.modifyPlayerWithRoadBonus();
  this.modifyPlayerWithArmyBonus();

  this.players.forEach(function (player) {
    player.score.victory_points = player.cards.count_victory_cards();
    player.score.total_points += (player.score.longest_road === true) ? 2 : 0;
    player.score.total_points += (player.score.largest_army) ? 2 : 0;
    player.score.total_points += player.score.victory_points;
  });

};

/**
 * Check if we have a winner
 * @return {Boolean}
 */
Game.prototype.haveWinner = function () {
  var winners = [];
  var highest_score = 0;
  this.players.forEach(function (player) {
    if (player.score.total_points >= this.WIN_SCORE) {
      if (player.score.total_points < highest_score) return;
      if (player.score.total_points > highest_score) winners = [];
      winners.push(player);
    }
  }, this);

  if (winners.length === 1) {
    // Toggle the winner flag for this player
    winners[0].winner = true;
    return true;
  }

  // None or more than one winner - we keep going...
  return false;
};

/**
 * Return a dev card to the pack after it has been used
 * @param {String} card : knight, monopoly, road_building, year_of_plenty
 */
Game.prototype.return_dev_card = function (card) {
  this.cards.push(card);
}

/**
 * @return {Array} : Array holding a shuffled first round order and a mirrored second round
 *                      i.e [1,2,3,0,0,3,2,1]
 */
Game.prototype.randomise_startup_array = function () {
  var shuffler = new Shuffler()
  var straight_array = [];
  //Create the first half of the array
  for (var i = 0; i < this.max_players; i++) {
    straight_array.push(i);
  }
  // Shuffle the first half
  var shuffled_array = shuffler.shuffle(straight_array);
  // add in the mirrored second half
  for (var j = this.max_players; j > 0; j--) {
    shuffled_array.push(shuffled_array[j - 1]);
  }
  return shuffled_array;
}

Game.prototype.generate_dice_rolls = function () {
  var shuffler = new Shuffler();
  var temp_dice = [];
  var robbers = 0;
  
  //  Add all dice combinations to an array
  for( var i = 1; i < 7; i++ ){
    for (var j = 1; j < 7; j++ ){
      if (i + j != 7 || this.robber_frequency > robbers) {
        robbers += (i + j == 7 ? 1 : 0);
        temp_dice.push([i,j]);
      }
    }
  }
  return shuffler.shuffle(temp_dice); 
}

Game.prototype.fixed_dice_rolls = function () {
  logger.log('debug', "Fixed dice rolls enabled");
  var dice1array = [[1,4], [2,4], [3,4], [4,4], [5,4], [6,4]];
  var temp_dice = [];

  for (var i = 0; i < 36; i++){
    temp_dice.push(dice1array[i%6]);
  }

  return temp_dice;
}
Game.prototype.rollingDice = function (){
  var shuffler = new Shuffler();
  this.dice_roll = this.dice_array[this.dice_array_pointer];

  this.dice_array_pointer++;
  if(this.dice_array_pointer === this.dice_array.length){
    this.dice_array_pointer = 0;
    if(this.test_mode === 'false'){
      this.dice_array = shuffler.shuffle(this.dice_array);
    }
    
  }

  return this.dice_roll[0] + this.dice_roll [1];
}

// swaps the cards in the tradecard list between players
Game.prototype.do_trade_with_other = function (player_id, other_id) {
  if (!this.players[other_id].inter_trade.wants_trade)
    return false;
  var swapsies = function (player, other, cards) {
    player.round_distribution_cards = new Cards();
    for (let card of Object.keys(cards)) {
      if (cards.get(card) > 0) {
        // take cards from the player wanting to trade, and give
        if (!other.cards.remove_multiple_cards(card, cards.get(card)))
          return false;
        player.cards.add_cards(card, cards.get(card));
        player.round_distribution_cards.add_cards(card, cards.get(card));
      }
    }
    return true;
  }
  let this_backup = this.trade_backup_player_cards(this.players[player_id]);
  let other_backup = this.trade_backup_player_cards(this.players[other_id]);

  if (swapsies(this.players[player_id], this.players[other_id],
      this.players[other_id].inter_trade.trade_cards)) {
    logger.log('debug', 'TRADE: from trade initiator ' + this.players[other_id].name + ' to ' + this.players[
      player_id].name);
    if (swapsies(this.players[other_id], this.players[player_id],
      this.players[other_id].inter_trade.wants_cards)) {
      logger.log('debug', 'TRADE: from trade acceptor ' + this.players[player_id].name + ' to ' + this.players[
        other_id].name);
      return true;
    } else {
      logger.log('debug', 'TRADE: failed at 2nd part');
    }
  } else {
    logger.log('debug', 'TRADE: failed at 1st part');
  }
  this.trade_restore_player_cards(this.players[player_id], this_backup);
  this.trade_restore_player_cards(this.players[other_id], other_backup);
  this.players[player_id].round_distribution_cards = new Cards();
  this.players[other_id].round_distribution_cards = new Cards();
  logger.log('info', 'TRADE: between ' + this.players[player_id].name + ' and ' +
                                          this.players[other_id].name + ' failed');
  return false;
};

Game.prototype.trade_backup_player_cards = function (player) {
  let cards = new TradeCards();
  for (let card of Object.keys(player.cards.resource_cards)) {
      cards.set(card, player.cards.resource_cards[card]);
  }
  logger.log('debug', 'TRADE: '+player.name+" backup cards =");
  logger.log('debug', cards);
  return cards;
};

Game.prototype.trade_restore_player_cards = function (player, backup) {
  for (let card of Object.keys(backup)) {
    player.cards.set(card, backup.get(card));
  }
  logger.log('debug', 'TRADE: '+player.name+" restored cards =");
  logger.log('debug', player.cards.resource_cards);
};

module.exports = Game;
