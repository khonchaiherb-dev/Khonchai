import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../public/tshop-v161-hotfix.js',import.meta.url),'utf8');
const calls=[];
let clickHandler=null;

const document={
  readyState:'complete',
  documentElement:{dataset:{}},
  addEventListener(type,fn){if(type==='click')clickHandler=fn},
  querySelector(){return null},
  querySelectorAll(){return []}
};
const context={
  console,
  document,
  navigator:{},
  sessionStorage:{getItem(){return null},setItem(){}},
  location:{reload(){calls.push(['reload'])}},
  queueMicrotask(fn){fn()},
  current:'product',
  qty:3,
  PRODUCTS:[{id:1,slug:'rang-jued-tea'}],
  count(){return 0},
  home(){calls.push(['home'])},
  bind(){calls.push(['bind'])},
  add(id,qty){calls.push(['add',String(id),Number(qty)])},
  checkout(){calls.push(['checkout'])},
  placeOrder(){calls.push(['placeOrder'])},
  cartPage(){calls.push(['cartPage'])},
  go(dest){calls.push(['go',dest])},
  product(p){calls.push(['product',p.slug])},
  toast(msg){calls.push(['toast',msg])}
};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'tshop-v161-hotfix.js'});
assert.equal(typeof clickHandler,'function','hotfix must register a capture click handler');

function element(kind,dataset={}){
  const selector={
    add:'[data-add]',buy:'[data-buy]',drawerAdd:'[data-v05-drawer-add]',drawerBuy:'[data-v05-drawer-buy]',place:'[data-place]',cart:'[data-go="cart"]',checkout:'[data-go="checkout"]',product:'[data-product]'
  }[kind];
  return {
    dataset,
    disabled:false,
    getAttribute(){return null},
    matches(q){return q===selector},
    closest(q){
      if(q.includes(selector))return this;
      if(kind==='product'&&q==='button,a,input,select,textarea,label')return null;
      return null;
    }
  };
}
function fire(el){
  let prevented=0,stopped=0;
  clickHandler({target:el,preventDefault(){prevented++},stopImmediatePropagation(){stopped++}});
  assert.equal(prevented,1,'handled interaction must prevent default');
  assert.equal(stopped,1,'handled interaction must stop duplicate legacy handlers');
}
function last(...expected){assert.deepEqual(calls.at(-1),expected)}

fire(element('add',{add:'1'})); last('add','1',3);
fire(element('buy',{buy:'1'})); assert.deepEqual(calls.slice(-2),[['add','1',3],['checkout']]);
fire(element('drawerAdd',{v05DrawerAdd:'1'})); last('add','1',1);
fire(element('drawerBuy',{v05DrawerBuy:'1'})); assert.deepEqual(calls.slice(-2),[['add','1',1],['checkout']]);
fire(element('cart',{go:'cart'})); last('cartPage');
fire(element('checkout',{go:'checkout'})); last('checkout');
fire(element('place',{})); last('placeOrder');
fire(element('product',{product:'rang-jued-tea'})); last('product','rang-jued-tea');

assert.match(source,/1\.6\.2/,'hotfix must expose the v1.6.2 build marker');
assert.match(source,/data-v05-drawer-add/,'LIVE/video drawer add-to-cart must be covered');
assert.match(source,/stopImmediatePropagation/,'duplicate click handlers must be suppressed');
console.log('storefront interaction smoke: OK');
