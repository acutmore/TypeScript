// @strict: true
// @target: esnext

// TODO(aclaymore) split up into seperate cases

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
        // '<'  has same prededence than 'in'
        // '<<' has higher prededence than 'in'

        v == #p1 in v == v; // Good precidence: ((v == (#p1 in v)) == v)

        v << #p1 in v << v; // Good precidence: (v << (#p1 in (v << v)))

        v << #p1 in v == v; // Good precidence: ((v << (#p1 in v)) == v)

        v == #p1 in v < v; // Good precidence: (v == ((#p1 in v) < v))

        #p1 in v && #p1 in v; // Good precidence: ((#p1 in v) && (#p1 in v))
    }
    flow(v: unknown) {
        if (typeof v === 'object' && v !== null) {
            if (#p1 in v) {
                const y1 = v; // good y1 is typeof Foo
            } else {
                const y2 = v; // y2 is not typeof Foo
            }
        }

        class Nested {
            m(v: any) {
                if (#p1 in v) {
                   const y1 = v; // Good y1 if typeof Foo
                }
            }
        }
    }
}

function error(v: Foo) {
    return #p1 in v; // Bad - outside of class
}
