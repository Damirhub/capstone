
/**
 * Action object describes a specific action for a player or
 *     a specific result from the server 
 */

function Action(){
    /**
     * Action types
     *   build_settlement
     *   build_road
     *   build_city
     *   year_of_plenty
     *   monopoly
     *   soldier_knight
     *   road_building
     *   new turn ...
     */
    this.action_type    = '';

    //action_data will vary based on action_type
    this.action_data    = [];
    
    //boost cards kept seperate so easy to count and to return
    this.boost_cards    = null;
};

Action.prototype.set_action_type = function(returned_action_type){
    this.action_type = returned_action_type;
};

Action.prototype.set_action_data = function (data){
    this.action_data = data;
};

Action.prototype.set_boost_cards = function (cards){
    this.boost_cards = cards;
};

Action.prototype.clear_data = function(){
    this.action_type    = '';
    this.action_data    = [];
    this.boost_cards    = null;
};

// TODO: Move action object inside data_package, 'action function' only required when Data_package is created
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Action;
}
