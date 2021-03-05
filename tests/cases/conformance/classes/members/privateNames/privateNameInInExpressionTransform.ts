// @target: es2020

// TODO(aclaymore) add cases for static fields

class Foo {
    #p1 = 1;
    check(v: any) {
        #p1 in v; // expect `_p1.has(v)`
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
}

class Bar {
    #p1 = 1;
    check(v: any) {
        #p1 in v; // expect `_p1_1.has(v)`
    }
}

function error(v: Foo) {
    return #p1 in v; // expect `in v`
}

export { }
