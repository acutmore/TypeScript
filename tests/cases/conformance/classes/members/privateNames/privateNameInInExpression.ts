// @strict: true
// @target: esnext

// TODO(aclaymore) split up into separate cases

class Foo {
    #p1 = 1;
    basics(v: any) {
        const a = #p1 in v; // Good - a is boolean

        const b = #p1 in v.p1.p2; // Good - b is boolean

        const c = #p1 in (v as {}); // Good - c is boolean

        const d = #p1 in (v as Foo); // Good d is boolean (not true)

        const e = #p1 in (v as unknown); // Bad - RHS of in must be object type or any

        const f = #p2 in v; // Bad - Invalid privateID

        const g = (#p1) in v; // Bad - private id is not an expression on it's own

        for (#p1 in v) { /* no-op */ } // Bad - 'in' not allowed

        for (let x in #p1 in v) { /* no-op */ } // Bad - rhs of in should be a object/any

        for (let x in #p1 in v as any) { /* no-op */ } // Good - weird but valid

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
    flow(u: unknown, fb: Foo | Bar, fs: FooSub, b: Bar) {

        if (typeof u === 'object') {

            if (#p1 in u) {
                u; // good u is Foo
            } else {
                u; // good u is object | null
            }

            if (u !== null) {
                if (#p1 in u) {
                    u; // good u is Foo
                } else {
                    u; // good u is object
                }
            }
        }

        if (#p1 in fb) {
            fb; // good fb is Foo
        } else {
            fb; // good fb is Bar
        }

        if (#p1 in fs) {
            fs; // good fb is Foo (or FooSub?)
        } else {
            fs; // good fs is never
        }

        if (#p1 in b) {
            b; // good b is 'Bar & Foo'
        } else {
            b; // good b is Bar
        }

        class Nested {
            m(v: any) {
                if (#p1 in v) {
                    v; // good v is Foo
                }
            }
        }
    }
}

class FooSub extends Foo { }
class Bar { notFoo = true }

function error(v: Foo) {
    return #p1 in v; // Bad - outside of class
}

export { }
