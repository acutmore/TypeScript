//// [privateNameInInExpression.ts]
// TODO(aclaymore) split up into seperate cases

class Foo {
    #p1 = 1;
    m1(v: {}) {
        #p1 in v; // Good
    }
    m2(v: any) {
        #p1 in v.p1.p2; // Good
    }
    m3(v: unknown) {
        #p1 in v; // Bad - RHS of in must be object type or any
    }
    m4(v: any) {
        #p2 in v; // Bad - Invalid private id
    }
    m5(v: any) {
        (#p1) in v; // Bad - private id is not an expression on it's own
    }
    m6(v: any) {
        for (#p1 in v) { /* no-op */ } // Bad - 'in' not allowed
    }
    m7(v: any) {
        for (let x in #p1 in v as any) { /* no-op */ } // Good - weird but valid
    }
    m8(v: any) {
        for (let x in #p1 in v) { /* no-op */ } // Bad - rhs of in should be a object/any
    }
    m9(v: any) {
        // '==' has lower precedence than 'in'
        // '<'  has same prededence than 'in'
        // '<<' has higher prededence than 'in'

        v == #p1 in v == v; // Good precidence: ((v == (#p1 in v)) == v)

        v << #p1 in v << v; // Good precidence: (v << (#p1 in (v << v)))

        v << #p1 in v == v; // Good precidence: ((v << (#p1 in v)) == v)

        v == #p1 in v < v; // Good precidence: (v == ((#p1 in v) < v))

        #p1 in v && #p1 in v; // Good precidence: ((#p1 in v) && (#p1 in v))
    }
    m10() {
        class Bar {
            m10(v: any) {
                #p1 in v; // Good: access parent class
            }
        }
    }
}

function error(v: Foo) {
    return #p1 in v; // Bad: outside of class
}


//// [privateNameInInExpression.js]
"use strict";
// TODO(aclaymore) split up into seperate cases
class Foo {
    constructor() {
        (this.#p1 = 1);
    }
    #p1;
    m1(v) {
        (#p1 in v); // Good
    }
    m2(v) {
        (#p1 in v.p1.p2); // Good
    }
    m3(v) {
        (#p1 in v); // Bad - RHS of in must be object type or any
    }
    m4(v) {
        (#p2 in v); // Bad - Invalid private id
    }
    m5(v) {
        (() in v); // Bad - private id is not an expression on it's own
    }
    m6(v) {
        for (#p1 in v) { /* no-op */ } // Bad - 'in' not allowed
    }
    m7(v) {
        for (let x in (#p1 in v)) { /* no-op */ } // Good - weird but valid
    }
    m8(v) {
        for (let x in (#p1 in v)) { /* no-op */ } // Bad - rhs of in should be a object/any
    }
    m9(v) {
        // '==' has lower precedence than 'in'
        // '<'  has same prededence than 'in'
        // '<<' has higher prededence than 'in'
        ((v == (#p1 in v)) == v); // Good precidence: ((v == (#p1 in v)) == v)
        (v << (#p1 in (v << v))); // Good precidence: (v << (#p1 in (v << v)))
        ((v << (#p1 in v)) == v); // Good precidence: ((v << (#p1 in v)) == v)
        (v == ((#p1 in v) < v)); // Good precidence: (v == ((#p1 in v) < v))
        ((#p1 in v) && (#p1 in v)); // Good precidence: ((#p1 in v) && (#p1 in v))
    }
    m10() {
        class Bar {
            m10(v) {
                (#p1 in v); // Good: access parent class
            }
        }
    }
}
function error(v) {
    return (#p1 in v); // Bad: outside of class
}
