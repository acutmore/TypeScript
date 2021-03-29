//// [privateNameInInExpressionTransform.ts]
// TODO(aclaymore) add cases for static fields

class Foo {
    #p1 = 1;
    check(v: any) {
        #p1 in v; // expect WeakMap '_Foo_p1'
    }
    precedence(v: any) {
        // '==' has lower precedence than 'in'
        // '<'  has same precedence than 'in'
        // '<<' has higher precedence than 'in'

        v == #p1 in v == v; // Good precedence: ((v == (#p1 in v)) == v)

        v << #p1 in v << v; // Good precedence: (v << (#p1 in (v << v)))

        v << #p1 in v == v; // Good precedence: ((v << (#p1 in v)) == v)

        v == #p1 in v < v; // Good precedence: (v == ((#p1 in v) < v))

        #p1 in v && #p1 in v; // Good precedence: ((#p1 in v) && (#p1 in v))
    }
    invalidLHS(v: any) {
        'prop' in v = 10;
        #p1 in v = 10;
    }
}

class Bar {
    #p1 = 1;
    check(v: any) {
        #p1 in v; // expect WeakMap '_Bar_p1'
    }
}

function syntaxError(v: Foo) {
    return #p1 in v; // expect `return in v` so runtime will have a syntax error
}

export { }


//// [privateNameInInExpressionTransform.js]
// TODO(aclaymore) add cases for static fields
var __classPrivateFieldIn = (this && this.__classPrivateFieldIn) || function(receiver, privateMap) {
    if (receiver === null || (typeof receiver !== 'object' && typeof receiver !== 'function')) {
        throw new TypeError("Cannot use 'in' operator on non-object");
    }
    return privateMap.has(receiver);
};
var _Foo_p1, _Bar_p1;
class Foo {
    constructor() {
        _Foo_p1.set(this, 1);
    }
    check(v) {
        __classPrivateFieldIn(v, _Foo_p1); // expect WeakMap '_Foo_p1'
    }
    precedence(v) {
        // '==' has lower precedence than 'in'
        // '<'  has same precedence than 'in'
        // '<<' has higher precedence than 'in'
        v == __classPrivateFieldIn(v, _Foo_p1) == v; // Good precedence: ((v == (#p1 in v)) == v)
        v << __classPrivateFieldIn(v << v, _Foo_p1); // Good precedence: (v << (#p1 in (v << v)))
        v << __classPrivateFieldIn(v, _Foo_p1) == v; // Good precedence: ((v << (#p1 in v)) == v)
        v == __classPrivateFieldIn(v, _Foo_p1) < v; // Good precedence: (v == ((#p1 in v) < v))
        __classPrivateFieldIn(v, _Foo_p1) && __classPrivateFieldIn(v, _Foo_p1); // Good precedence: ((#p1 in v) && (#p1 in v))
    }
    invalidLHS(v) {
        'prop' in v;
        10;
        __classPrivateFieldIn(v, _Foo_p1);
        10;
    }
}
_Foo_p1 = new WeakMap();
class Bar {
    constructor() {
        _Bar_p1.set(this, 1);
    }
    check(v) {
        __classPrivateFieldIn(v, _Bar_p1); // expect WeakMap '_Bar_p1'
    }
}
_Bar_p1 = new WeakMap();
function syntaxError(v) {
    return  in v; // expect `return in v` so runtime will have a syntax error
}
export {};
