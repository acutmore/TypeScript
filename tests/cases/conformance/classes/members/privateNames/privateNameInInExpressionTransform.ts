// @target: es2020

// TODO(aclaymore) add cases for static fields

class Foo {
    #p1 = 1;
    check(v: any) {
        #p1 in v; // expect WeakMap '_p1'
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
        #p1 in v; // expect WeakMap '_p1_1'
    }
}

function syntaxError(v: Foo) {
    return #p1 in v; // expect `return in v` so runtime will have a syntax error
}

export { }
