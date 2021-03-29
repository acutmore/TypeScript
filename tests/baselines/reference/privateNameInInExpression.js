//// [privateNameInInExpression.ts]
class Foo {
    #field = 1;
    static #staticField = 2;
    #method() {}
    static #staticMethod() {}

    basics(v: any) {
        const a = #field in v; // Good - a is boolean

        const b = #field in v.p1.p2; // Good - b is boolean

        const c = #field in (v as {}); // Good - c is boolean

        const d = #field in (v as Foo); // Good d is boolean (not true)

        const e = #field in (v as never); // Good e is boolean

        const f = #field in (v as unknown); // Bad - RHS of in must be object type or any

        const g = #typo in v; // Bad - Invalid privateID

        const h = (#field) in v; // Bad - private id is not an expression on its own

        for (#field in v) { /* no-op */ } // Bad - 'in' not allowed

        for (let x in #field in v) { /* no-op */ } // Bad - rhs of in should be a object/any

        for (let x in #field in v as any) { /* no-op */ } // Good - weird but valid

    }
    whitespace(v: any) {
        const a = v && /*0*/#field/*1*/
            /*2*/in/*3*/
                /*4*/v/*5*/
    }
    flow(u: unknown, n: never, fb: Foo | Bar, fs: FooSub, b: Bar, fsb: FooSub | Bar) {

        if (typeof u === 'object') {
            if (#field in n) {
                n; // good n is never
            }

            if (#field in u) {
                u; // good u is Foo
            } else {
                u; // good u is object | null
            }

            if (u !== null) {
                if (#field in u) {
                    u; // good u is Foo
                } else {
                    u; // good u is object
                }

                if (#method in u) {
                    u; // good u is Foo
                }

                if (#staticField in u) {
                    u; // good u is typeof Foo
                }

                if (#staticMethod in u) {
                    u; // good u is typeof Foo
                }
            }
        }

        if (#field in fb) {
            fb; // good fb is Foo
        } else {
            fb; // good fb is Bar
        }

        if (#field in fs) {
            fs; // good fs is FooSub
        } else {
            fs; // good fs is never
        }

        if (#field in b) {
            b; // good b is 'Bar & Foo'
        } else {
            b; // good b is Bar
        }

        if (#field in fsb) {
            fsb; // good fsb is FooSub
        } else {
            fsb; // good fsb is Bar
        }

        class Nested {
            m(v: any) {
                if (#field in v) {
                    v; // good v is Foo
                }
            }
        }
    }
}

class FooSub extends Foo { subTypeOfFoo = true }
class Bar { notFoo = true }

function badSyntax(v: Foo) {
    return #field in v; // Bad - outside of class
}


//// [privateNameInInExpression.js]
"use strict";
class Foo {
    constructor() {
        this.#field = 1;
    }
    #field;
    static #staticField;
    #method() { }
    static #staticMethod() { }
    basics(v) {
        const a = #field in v; // Good - a is boolean
        const b = #field in v.p1.p2; // Good - b is boolean
        const c = #field in v; // Good - c is boolean
        const d = #field in v; // Good d is boolean (not true)
        const e = #field in v; // Good e is boolean
        const f = #field in v; // Bad - RHS of in must be object type or any
        const g = #typo in v; // Bad - Invalid privateID
        const h = (#field) in v; // Bad - private id is not an expression on its own
        for (#field in v) { /* no-op */ } // Bad - 'in' not allowed
        for (let x in #field in v) { /* no-op */ } // Bad - rhs of in should be a object/any
        for (let x in #field in v) { /* no-op */ } // Good - weird but valid
    }
    whitespace(v) {
        const a = v && /*0*/ #field/*1*/ 
            /*2*/ in /*3*/
                /*4*/ v; /*5*/
    }
    flow(u, n, fb, fs, b, fsb) {
        if (typeof u === 'object') {
            if (#field in n) {
                n; // good n is never
            }
            if (#field in u) {
                u; // good u is Foo
            }
            else {
                u; // good u is object | null
            }
            if (u !== null) {
                if (#field in u) {
                    u; // good u is Foo
                }
                else {
                    u; // good u is object
                }
                if (#method in u) {
                    u; // good u is Foo
                }
                if (#staticField in u) {
                    u; // good u is typeof Foo
                }
                if (#staticMethod in u) {
                    u; // good u is typeof Foo
                }
            }
        }
        if (#field in fb) {
            fb; // good fb is Foo
        }
        else {
            fb; // good fb is Bar
        }
        if (#field in fs) {
            fs; // good fs is FooSub
        }
        else {
            fs; // good fs is never
        }
        if (#field in b) {
            b; // good b is 'Bar & Foo'
        }
        else {
            b; // good b is Bar
        }
        if (#field in fsb) {
            fsb; // good fsb is FooSub
        }
        else {
            fsb; // good fsb is Bar
        }
        class Nested {
            m(v) {
                if (#field in v) {
                    v; // good v is Foo
                }
            }
        }
    }
}
Foo.#staticField = 2;
class FooSub extends Foo {
    constructor() {
        super(...arguments);
        this.subTypeOfFoo = true;
    }
}
class Bar {
    constructor() {
        this.notFoo = true;
    }
}
function badSyntax(v) {
    return #field in v; // Bad - outside of class
}
