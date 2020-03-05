/*
 * Change fighterCount to any integer from 1 to 12 if you want to change the size of the battle. Things start to break down with numbers much higher than that.
 *
 * TODO:
 *    Add a drop-down to let the user choose the number of characters.
 *    Unit tests!
 *    Get my API key out of superHeroService.js (this would require a server-side wrapper around all API calls).
 */

app
  .controller('fightController', function ($scope, $interval, $location, SuperHeroService, RandomService) {

    $scope.fighterCount = parseInt($location.search().count);
    if (!$scope.fighterCount || $scope.fighterCount > 12 || $scope.fighetCount < 1)
      $scope.fighterCount = 4;
    $scope.fighters = Array.apply(null, Array($scope.fighterCount)).map(function () { return {}; });//init the array to full-size with empty objects

    //all the fields we want displayed next to the character image
    $scope.info = [{
      label: 'Name',
      field: 'name'
    }/*, {
      label: 'Aliases',
      field: 'biography.aliases'
    }*/, {
      label: '1st Appeared',
      field: 'biography.first-appearance'
    }, {
      label: 'Publisher',
      field: 'biography.publisher'
    }
    ];

    //get the value of a property on the fighter
    $scope.getStat = function (fighter, field) {
      if (!fighter.stats)
        return '';

      //some properties of this json come back with hyphens (full-name), which angular can't read, so convert it to a series of array calls
      var fields = field.split('.');
      var prop = fighter.stats;
      for (var i = 0; i < fields.length; i++)
        prop = prop[fields[i]];
      return Array.isArray(prop) ? prop.join(', ') : prop;
    };

    //search for a character by the name that's been typed in the search box
    $scope.search = function (index) {
      var searchText = $scope.fighters[index].searchText;
      $scope.fighters[index] = { searchText };//clear everything but the search text

      SuperHeroService.search(searchText)
        .then(function (d) {
          $scope.fighters[index].results = d.data.results;
          if (d.data.error)
            $scope.fighters[index].error = d.data.error;
          else if (d.data.results.length === 1) //if we just have one result auto-select it
            $scope.fighters[index].stats = d.data.results[0];
      });
    };

    $scope.dice = function (num) {
      //turn the 1-100 values into d6 rolls
      if (num < 10)
        return num;
      if (num === 100)
        return '10d6';

      return num[0] + 'd6' + (num[1] === '0' ? '' : '+' + num[1]);
    };

    $scope.allValid = function () {
      return !$scope.fighters.some(e => e.error);
    }

    $scope.fight = function () {
      $scope.fightText = [];
      $scope.fighting = true;
      $scope.winner = null;

      $scope.battle = $interval(function () {
        var attacker = null;
        var defender = null;
        while (!attacker || attacker.dead)
          attacker = $scope.fighters[RandomService.integer(0, $scope.fighters.length - 1)];
        while (!defender || defender.dead || attacker === defender)
          defender = $scope.fighters[RandomService.integer(0, $scope.fighters.length - 1)];

        //initialied the list of disabled stats if needed
        if (!attacker.disabled)
          attacker.disabled = [];
        if (!defender.disabled)
          defender.disabled = [];

        var attackStat = null;
        var defendStat = null;
        while (!attackStat || attacker.disabled[attackStat])
          attackStat = Object.keys(attacker.stats.powerstats)[RandomService.integer(0, 5)];
        while (!defendStat || defender.disabled[defendStat])
          defendStat = Object.keys(defender.stats.powerstats)[RandomService.integer(0, 5)];

        var attackDice = $scope.dice(attacker.stats.powerstats[attackStat]);
        var defendDice = $scope.dice(defender.stats.powerstats[defendStat]);

        var attackTotal = RandomService.dice(attackDice);
        var defendTotal = RandomService.dice(defendDice);

        var result = attackTotal > defendTotal ? 'wins' : attackTotal < defendTotal ? 'loses' : 'ties';
        switch (result) {
          case 'wins': defender.disabled[defendStat] = 'disabled by ' + attacker.stats.name + '\'s ' + attackStat; break;
          case 'loses': attacker.disabled[attackStat] = 'disabled by ' + defender.stats.name + '\'s ' + defendStat; break;
        }

        if (Object.keys(attacker.disabled).length === 6)
          attacker.dead = defender;

        if (Object.keys(defender.disabled).length === 6)
          defender.dead = attacker;

        $scope.fightText.push({
          attacker: attacker.stats,
          defender: defender.stats,
          attackStat,
          defendStat,
          attackDice,
          defendDice,
          attackTotal,
          defendTotal,
          result,
          dead: attacker.dead ? attacker.stats.name : defender.dead ? defender.stats.name : null,
        });

        var stillAlive = 0;
        for (var i = 0; i < $scope.fighters.length; i++)
          if (!$scope.fighters[i].dead)
            stillAlive++;

        if (stillAlive === 1) {
          var winner = attacker.dead ? defender : attacker;
          winner.winner = true;
          $scope.winner = winner;
          $scope.fighting = false;
          $interval.cancel($scope.battle);
        }
      }, 500);
    };

    $scope.reset = function () {
      for (var i = 0; i < $scope.fighters.length; i++) {
        var fighter = $scope.fighters[i];
        fighter.winner = null;
        fighter.dead = null;
        fighter.disabled = null;
      }
      $scope.winner = null;
      $scope.fightText = null;
    };

    const minId = 1;
    const maxId = 732; //found via trial and error on the api website
    $scope.rndUsed = [];

    $scope.randomize = function () {
      $scope.winner = null;
      for (var i = 0; i < $scope.fighters.length; i++) {
        $scope.getRandom(i);
      }
    };

    //get a single random character that has all the fields we need
    //this is split out into a separate function from "randomize" so that I could recursively retry a single fighter block at a time
    $scope.getRandom = function (index) {
      //get a random Id we haven't used yet
      var rndId = 0;
      while (rndId === 0 || $scope.rndUsed.includes(rndId))
        rndId = RandomService.integer(minId, maxId);
      $scope.rndUsed.push(rndId);

      SuperHeroService.get(rndId).then(function (d) {
        if (d.data.powerstats.intelligence !== 'null') {
          $scope.fighters[index] = {};
          $scope.fighters[index].searchText = d.data.name;
          $scope.fighters[index].results = [d.data];
          $scope.fighters[index].stats = d.data;
        }
        else {
          $scope.getRandom(index);//try again if we get a result that is missing power stats
          //todo: it'd be nice to also try again if we got an image that results in 404, but I'm trying not to go overboard on this project
        }
      });

    };
    $scope.randomize();
  });