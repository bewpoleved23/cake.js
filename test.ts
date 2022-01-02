interface Name {
    a:number,
    b:any,
}
let obj = {
    a: 'a',
    b:2
}
function log(name: Name){
    console.log(name.a);
};

log({a:'a', b:1});