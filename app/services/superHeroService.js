app.service('SuperHeroService', function ($http) {
  var baseUrl = "https://www.superheroapi.com/api.php/10219733057491162/";
  var searchUrl = baseUrl + '/search/:name';
  var getUrl = baseUrl + ':id';

  this.search = function (name) {
    return $http.get(searchUrl.replace(':name', name));
  };
  this.get = function (id) {
    return $http.get(getUrl.replace(':id', id));
  };
});