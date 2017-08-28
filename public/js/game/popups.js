//  Generic method to build a popup from a template
//   popupClass: name of the html file without the extention
//   customData: array of paired values to replace corresponding tags in the html template (i.e. {player_name})
function buildPopup(popupClass, useLarge, customData) {
    $.get("templates/" + popupClass + ".html", function(data) {

        //  In a few cases, we need a larger popup
        $(".popup_inner").removeClass("popup_inner_large");
        if (useLarge) {
            $(".popup_inner").addClass("popup_inner_large");
        }

        //  Now load and update the template
        var html = data;
        if (customData) {
            customData.forEach(function(data) {
                html = html.replace(new RegExp("{" + data[0] + "}", 'g'), data[1]);
            });
        }
        $(".popup_inner").html(html);
        $(".popup").show();

    });
}
function hidePopup() {
    $('.popup').fadeOut(400, function() {

    });
}

/***************************************************
 *  start_up.html
 **************************************************/
function build_popup_start(section) {
    buildPopup(section, false);
}

/***************************************************
 *  start_intro.html
 **************************************************/

/***************************************************
 *  start_menu.html
 **************************************************/
function build_popup_start_menu() {
    buildPopup("start_menu", false);
}

/***************************************************
 *  start_settings.html
 **************************************************/

/***************************************************
 *  start_players.html
 **************************************************/


/***************************************************
 *  waiting_for_players.html
 **************************************************/
function build_popup_waiting_for_players(data) {
    buildPopup("waiting_for_players", false, data);
}

/***************************************************
 *  setup_phase_your_turn.html
 **************************************************/
function build_popup_setup_phase_your_turn(setup_round) {
    if(setup_round === 1){
        //TODO: Place First Settlement
        buildPopup("setup_phase_your_turn", false);
    }else{
        //TODO: Place Second Settlement
        buildPopup("setup_phase_your_turn", false);
    }
}

/***************************************************
 *  waiting_for_turn.html
 **************************************************/
function build_popup_waiting_for_turn() {
    buildPopup("waiting_for_turn", false);
}

/***************************************************
 *  setup_complete.html
 **************************************************/
//  build_popup_setup_complete
//      Shows resourcees given from setup phase
//          {setup_cards} - html list of cards
function build_popup_setup_complete() {

    //  First build a list of cards received during the setup round
    var popup_data = [];
    popup_data.push(["brick", current_game.player.cards.resource_cards.brick - current_game.player.round_distribution_cards.resource_cards.brick]);
    popup_data.push(["sheep", current_game.player.cards.resource_cards.sheep - current_game.player.round_distribution_cards.resource_cards.sheep]);
    popup_data.push(["ore", current_game.player.cards.resource_cards.ore - current_game.player.round_distribution_cards.resource_cards.ore]);
    popup_data.push(["lumber", current_game.player.cards.resource_cards.lumber - current_game.player.round_distribution_cards.resource_cards.lumber]);
    popup_data.push(["grain", current_game.player.cards.resource_cards.grain - current_game.player.round_distribution_cards.resource_cards.grain]);

    //  Build the html to show the cards in the popup
    var card_html = "";
    for (var i = 0; i < popup_data.length; i++) {
        for (var j = 0; j < popup_data[i][1]; j++) {
            card_html += '<div class="build_card" style="z-index:' + (500 + i) + ';"><img src="images/card_' + popup_data[i][0] + '_small.png"></div>';
        }
    }

    //  Build the popup
    buildPopup("setup_complete", false, [["setup_cards", card_html]]);

}

/***************************************************
 *  round_roll_results.html
 **************************************************/
//  build_popup_round_roll_results
//      Shows resources, dice roll and result of robber for upcoming round
//          {setup_cards} - html list of cards
//          {dice1} - numeric result of 1st dice
//          {dice2} - numeric result of 2nd dice
function build_popup_round_roll_results() {

    var robber_active = current_game.dice_values[0] + current_game.dice_values[1] === 7;

    var title = robber_active ?
          "Robbed! Resources stolen this round:" :
          "Resources received this round:";

    // User the multipler to convert negative to positive for display
    var multiplier = robber_active ? -1 : 1;

    var popup_data = [];
    popup_data.push(["brick", current_game.player.round_distribution_cards.resource_cards.brick * multiplier]);
    popup_data.push(["sheep", current_game.player.round_distribution_cards.resource_cards.sheep * multiplier]);
    popup_data.push(["ore", current_game.player.round_distribution_cards.resource_cards.ore * multiplier]);
    popup_data.push(["lumber", current_game.player.round_distribution_cards.resource_cards.lumber * multiplier]);
    popup_data.push(["grain", current_game.player.round_distribution_cards.resource_cards.grain * multiplier]);

    //  Build the html to show the cards in the popup
    var card_html = "";
    for (var i = 0; i < popup_data.length; i++) {
        for (var j = 0; j < popup_data[i][1]; j++) {
            card_html += '<div class="build_card" style="z-index:' + (500 + i) + ';"><img src="images/card_' + popup_data[i][0] + '_small.png"></div>';
        }
    }
    if (card_html.length == 0) {
        card_html += 'Nothing for you!';
    }

    //  Robber
    var robber_display = "none";
    if (robber_active) {
      robber_display = "block";
    }

    //  Build the popup
    buildPopup("round_roll_results", false, [
      ["dice1", current_game.dice_values[0]],
      ["dice2", current_game.dice_values[1]],
      ["setup_cards", card_html],
      ["robber", robber_display],
      ["title", title]
    ]);
}

/***************************************************
 *  round_use_monopoly.html
 **************************************************/
function build_popup_use_monopoly() {
    buildPopup('round_use_monopoly', false);
}

/***************************************************
 *  round_build.html
 **************************************************/
//  build_popup_round_build
//      Creates the initial popup for building an item, and allows the selection of
//      extra resources to win conflicts
//          {object_type} - Object being built (road/house/city)
//          {build_cards} - html list of cards
function build_popup_round_build(object_type) {
    //  Get the list of cards needed
    var cards = new Cards();
    var card_list = cards.get_required_cards(object_type);
    var card_html = "";

    for (var i = 0; i < card_list.length; i++) {
        card_html += '<div class="build_card" style="z-index:' + (500 + i) + ';"><img class="trade_' + card_list[i] + '" src="images/card_' + card_list[i] + '_small.png"></div>';
    }

    buildPopup("round_build", false, [["object_type", object_type], ["build_cards", card_html]]);
}
//  round_build_complete
//      Build button in the round_build.html template
function round_build_complete() {
    //  Get html holding the cards
    var build_cards = $(".build_card_list").html();
    var extra_cards = $(".extra_card_list").html();
    var card_list = [];

    //  Create a reference to the players cards
    var my_cards = new Cards();
    my_cards.resource_cards = current_game.player.cards.resource_cards;

    //  Remove cards from player
    var resource_list = ['ore', 'brick', 'lumber', 'grain', 'sheep'];
    for (var i = 0; i < resource_list.length; i++) {
        //  Count each instance in the html
        var resource_count = (extra_cards.match(resource_list[i], 'g') ? extra_cards.match(resource_list[i], 'g').length : 0) + (build_cards.match(resource_list[i], 'g') ? build_cards.match(resource_list[i], 'g').length : 0);
        if (resource_count > 0) {
            //  Remove that many from the player
            var result = my_cards.remove_multiple_cards(resource_list[i], resource_count);

            //  Keep track of the cards
            for (var j = 0; j < resource_count; j++) {
                card_list.push(resource_list[i]);
            }
        }

    }

    //  Update the turn_action data
    turn_actions[turn_actions.length-1].boost_cards = card_list;

    //  Update our counts
    update_object_counts();
    updatePanelDisplay();

    //  All done!
    hidePopup();
}
//  round_build_abort
//      Nevermind button in the round_build.html template
function round_build_abort() {
    //  We need to return it to the pile and remove it from turn_actions
    var object_type = (turn_actions[turn_actions.length - 1].action_type == "build_road" ? "road" : "house");
    var object_node = turn_actions[turn_actions.length - 1].action_data;
    var object_to_return = $("#" + object_type + "_" + current_player.colour + "_pending_" + object_node.id);
    return_object(object_to_return, object_to_return.attr("id"), object_node.id);
    hidePopup();
}

/***************************************************
 *  round_use_card.html
 **************************************************/
function build_popup_round_use_card() {
    buildPopup("round_use_card", false);
}

/***************************************************
 *  round_use_year_of_plenty.html
 **************************************************/
function build_popup_round_use_year_of_plenty() {
    buildPopup("round_use_year_of_plenty", false);
}

/***************************************************
 *  round_domestic_trade.html
 **************************************************/
function build_popup_round_domestic_trade() {
    buildPopup("round_domestic_trade", false);
}

/***************************************************
 *  round_maritime_trade.html
 **************************************************/
function build_popup_round_maritime_trade() {
    buildPopup("round_maritime_trade", false);
}

/***************************************************
 *  round_domestic_trade.html
 **************************************************/
function build_popup_round_domestic_trade() {
    buildPopup("round_domestic_trade", false);
}

/***************************************************
 *  round_waiting_others.html
 **************************************************/
function build_popup_round_waiting_for_others() {
    buildPopup("round_waiting_others", false);
}

/***************************************************
 *  round_post_results.html
 **************************************************/
function build_popup_failed_moves() {
    buildPopup("round_post_results", false);
}

 /***************************************************
 *  player_detail.html
 **************************************************/
function build_popup_player_detail() {
    buildPopup("player_detail", false);
}

 /***************************************************
 *  end_results.html
 **************************************************/
function build_popup_end_results() {
    buildPopup("end_results", false);
}