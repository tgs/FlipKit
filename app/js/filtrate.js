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
        termList.forEach(function(term) {
            if (! stopwords.hasOwnProperty(term)) {
                terms[term] = 1;
            }
        });

        var tags = {};
        tagFields.forEach(function(tagField) {
            tags[item[tagField]] = 1;
        });
        return {'terms': terms, 'tags': tags};
    });
    var result = {};

    result.find = function(query, tags, ifMatch, ifNoMatch) {
        if (ifMatch === undefined) {
            ifMatch = function() {};
        }
        if (ifNoMatch === undefined) {
            ifNoMatch = function() {};
        }
        var terms = normalize(query);
        index.forEach(function(indexEntry, i) {
            var isMatch = (terms.length === 0) || terms.every(function (term) {
                return (term.length === 0) || (term in indexEntry.terms);
            });
            var hasTagMatch = (tags.length === 0) || tags.some(function(tag) {
                return (tag in indexEntry.tags);
            });
            /*console.log("q(" + query + ")  i(" + JSON.stringify(indexEntry.terms) +
                        "): " + isMatch);*/
            if (isMatch && hasTagMatch) {
                ifMatch(collection[i]);
            } else {
                ifNoMatch(collection[i]);
            }
        });
    };

    return result;
}

function normalize(str) {
    if (str) {
        return tokenize(str).map(stemmer);
    } else {
        return '';
    }
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
