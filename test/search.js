var imageList = require('../app/js/imageList.json');
var filtrate = require('../app/js/filtrate.js');
var assert = require('assert');

var exampleData = [
    {name: 'Disco', species: 'dog', favoriteFoods: 'cheese', favoriteColor: 'color blind'},
    {name: 'Paige', species: 'dog', favoriteFoods: 'chicken', favoriteColor: 'color blind'},
    {name: 'Thomas', species: 'human', favoriteFoods: 'artichokes cheese', favoriteColor: 'green'}
]

describe('filtrate', function() {
    describe('#filtrate()', function() {
        var filt = filtrate.filtrate(exampleData,
                                     ['name', 'species', 'favoriteFoods'],
                                     ['favoriteColor']);

        it('should call the callback when it finds results', function() {
            var res = [];
            filt.find('dog', [], function (item) { res.push(item) });
            assert.deepEqual(res, [exampleData[0], exampleData[1]]);
        });
        it('should require all terms to match', function() {
            var res = [];
            filt.find('dog cheese', [], function (item) { res.push(item) });
            assert.deepEqual(res, [exampleData[0]]);
        });
        it('should not tokenize tags', function() {
            var res = [];
            filt.find('', ['color'], function (item) { res.push(item) });
            assert.deepEqual(res, []);

            filt.find('', ['color blind'], function (item) { res.push(item) });
            assert.deepEqual(res, [exampleData[0], exampleData[1]]);
        });
    });

    describe('#stem()', function() {
        it('should stem some normal words', function() {
            assert.equal(filtrate.stem('required'), 'requir');
            assert.equal(filtrate.stem('girls'), 'girl');
        });
        it('should not stem numbers or identifiers', function() {
            assert.equal(filtrate.stem('0012'), '0012');
            assert.equal(filtrate.stem('wy0012'), 'wy0012');
            assert.equal(filtrate.stem('area4'), 'area4');
        });
    });

    describe('#normalize()', function() {
        it('should stem and split', function() {
            assert.deepEqual(filtrate.normalize('ant required bee'),
                             ['ant', 'requir', 'bee']);
        });
    });

    describe('#tokenize()', function() {
        it('should split on spaces', function() {
            assert.deepEqual(filtrate.tokenize('ant and bee'), ['ant', 'and', 'bee']);
        });
    });
});
