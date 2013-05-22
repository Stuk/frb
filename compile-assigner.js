
var compileEvaluator = require("./compile-evaluator");

module.exports = compile;
function compile(syntax) {
    return compile.semantics.compile(syntax);
}

compile.semantics = {

    compile: function (syntax) {
        var compilers = this.compilers;
        if (syntax.type === "equals") {
            var assignLeft = this.compile(syntax.args[0]);
            var evaluateRight = this.compileEvaluator(syntax.args[1]);
            return compilers.equals(assignLeft, evaluateRight);
        } else if (syntax.type === "if") {
            var evaluateCondition = this.compileEvaluator(syntax.args[0]);
            var assignConsequent = this.compile(syntax.args[1]);
            var assignAlternate = this.compile(syntax.args[2]);
            return compilers["if"](evaluateCondition, assignConsequent, assignAlternate);
        } else if (compilers.hasOwnProperty(syntax.type)) {
            var argEvaluators = syntax.args.map(this.compileEvaluator, this.compileEvaluator.semantics);
            return compilers[syntax.type].apply(null, argEvaluators);
        } else {
            throw new Error("Can't compile assigner for " + JSON.stringify(syntax.type));
        }
    },

    compileEvaluator: compileEvaluator,

    compilers: {

        property: function (evaluateObject, evaluateKey) {
            return function (value, scope) {
                var object = evaluateObject(scope);
                if (!object) return;
                var key = evaluateKey(scope);
                if (key == null) return;
                if (Array.isArray(object)) {
                    object.set(key, value);
                } else {
                    object[key] = value;
                }
            };
        },

        get: function (evaluateCollection, evaluateKey) {
            return function (value, scope) {
                var collection = evaluateCollection(scope);
                if (!collection) return;
                var key = evaluateKey(scope);
                if (key == null) return;
                collection.set(key, value);
            };
        },

        has: function (evaluateCollection, evaluateValue) {
            return function (has, scope) {
                var collection = evaluateCollection(scope);
                if (!collection) return;
                var value = evaluateValue(scope);
                if (has == null) return;
                if (has) {
                    if (!(collection.has || collection.contains).call(collection, value)) {
                        collection.add(value);
                    }
                } else {
                    if ((collection.has || collection.contains).call(collection, value)) {
                        (collection.remove || collection["delete"]).call(collection, value);
                    }
                }
            };
        },

        equals: function (assignLeft, evaluateRight) {
            return function (value, scope) {
                if (value) {
                    return assignLeft(evaluateRight(scope), scope);
                }
            };
        },

        "if": function (evaluateCondition, assignConsequent, assignAlternate) {
            return function (value, scope) {
                var condition = evaluateCondition(scope);
                if (condition == null) return;
                if (condition) {
                    return assignConsequent(value, scope);
                } else {
                    return assignAlternate(value, scope);
                }
            };
        },

        rangeContent: function (evaluateTarget) {
            return function (value, scope) {
                var target = evaluateTarget(scope);
                if (!target) return;
                if (!value) {
                    target.clear();
                } else {
                    target.swap(0, target.length, value);
                }
            };
        },

        mapContent: function (evaluateTarget) {
            return function (value, scope) {
                var target = evaluateTarget(scope);
                if (!target) return;
                target.clear();
                if (scope.value) {
                    target.addEach(value);
                }
            };
        },

        reversed: function (evaluateTarget) {
            return function (value, scope) {
                var target = evaluateTarget(scope);
                if (!target) return;
                target.swap(0, target.length, value.reversed());
            };
        }

    }

}

