app.service('RandomService', function () {
  this.integer = function (min, max) {
    return Math.floor(Math.random() * (max + 1 - min) + min);
  };

  this.dice = function (val) {
    var sum = val.split('+');
    var grandTotal = 0;
    for (var i = 0; i < sum.length; i++) {
      if (sum[i].indexOf('d') >= 0) {
        die = sum[i].split('d');
        var total = 0;
        for (var d = 0; d < die[0]; d++)
          total += this.integer(1, die[1]);
        grandTotal += total;
      }
      else
        grandTotal += parseInt(sum[i]);
    }
    return grandTotal;
  };
});