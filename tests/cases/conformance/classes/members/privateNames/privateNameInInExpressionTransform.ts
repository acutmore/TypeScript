// @target: es2020

// TODO(aclaymore) check where transform cases live
// TODO(aclaymore) add cases for static fields

class Foo {
    #p1 = 1;
    check(v: any) {
        #p1 in v; // expect `_p1.has(v)`
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
