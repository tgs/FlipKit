var stemmer = require('porter-stemmer').stemmer;

function filtrate(collection, fields, tagFields) {
    // Construct the index
    var index = collection.map(function(item) {
        // I'm guessing it's ok to keep tags and terms in the same place
        var terms = {};
        var termList = [].concat.apply(
            [],
            fields.map(function(field) {
                return normalize(item[field]);
            })
        );
        termList = termList.concat(tagFields.map(
            function(tagField) { return item[tagField]; }));
        termList.forEach(function(term) {
            if (! stopwords.hasOwnProperty(term)) {
                terms[term] = 1;
            }
        });
        return terms;
    });
    var result = {};

    result.find = function(query, tags, ifMatch, ifNoMatch) {
        if (ifMatch === undefined) {
            ifMatch = function() {};
        }
        if (ifNoMatch === undefined) {
            ifNoMatch = function() {};
        }
        var terms = normalize(query).concat(tags);
        index.forEach(function(termsPresent, index) {
            var isMatch = (terms === []) || terms.every(function (term) {
                return (term.length === 0) || (term in termsPresent);
            });
            if (isMatch) {
                ifMatch(collection[index]);
            } else {
                ifNoMatch(collection[index]);
            }
        });
    };

    return result;
}

function normalize(str) {
    return tokenize(str).map(stemmer); //function(item) { return stemmer(item); });
}

function tokenize(str) {
    return str.toLowerCase()
        .split(/\s+/);
        //.filter(function(el) { return el.length > 0; });
}

// TODO:
//   I -> eye (I street)
//   more stopwords
var stopwords = {
    '': 1,
    'a': 1,
    'the': 1
};


module.exports = {
    'tokenize': tokenize,
    'normalize': normalize,
    'stem': stemmer,
    'filtrate': filtrate,
};
