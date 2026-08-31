import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../public/tshop-v161-hotfix.js',import.meta.url),'utf8');
const calls=[];const handlers={};
const document={readyState:'complete',documentElement:{dataset:{}},addEventListener(type,fn){handlers[type]=fn},querySelector(){return null},querySelectorAll(){return []}};
const context={console,document,navigator:{},sessionStorage:{getItem(){return null},setItem(){}},location:{reload(){calls.push(['reload'])}},queueMicrotask(fn){fn()},current:'product',qty:3,PRODUCTS:[{id:1,slug:'rang-jued-tea'}],count(){return 0},home(){calls.push(['home'])},bind(){calls.push(['bind'])},add(id,qty){calls.push(['add',String(id),Number(qty)]);return true},checkout(){calls.push(['checkout'])},placeOrder(){calls.push(['placeOrder'])},cartPage(){calls.push(['cartPage'])},go(dest){calls.push(['go',dest])},product(p){calls.push(['product',p.slug])},toast(msg){calls.push(['toast',msg])}};context.window=context;
vm.createContext(context);vm.runInContext(source,context,{filename:'tshop-v161-hotfix.js'});assert.equal(typeof handlers.click,'function');assert.equal(typeof handlers.pointerdown,'function');assert.equal(typeof handlers.pointerup,'function');
function element(kind,dataset={}){const selector={add:'[data-add]',buy:'[data-buy]',drawerAdd:'[data-v05-drawer-add]',drawerBuy:'[data-v05-drawer-buy]',place:'[data-place]',cart:'[data-go="cart"]',checkout:'[data-go="checkout"]',product:'[data-product]'}[kind];return {dataset,disabled:false,isConnected:true,getAttribute(){return null},matches(q){return q===selector},closest(q){if(q.includes(selector))return this;if(kind==='product'&&q==='.tshop-card[data-product]')return this;if(kind==='product'&&q==='button,a,input,select,textarea,label')return null;return null}}}
function fire(el){let prevented=0,stopped=0;handlers.click({target:el,preventDefault(){prevented++},stopImmediatePropagation(){stopped++}});assert.equal(prevented,1);assert.equal(stopped,1)}
function last(...expected){assert.deepEqual(calls.at(-1),expected)}
fire(element('add',{add:'1'}));last('add','1',3);
fire(element('buy',{buy:'1'}));assert.deepEqual(calls.slice(-2),[['add','1',3],['checkout']]);
fire(element('drawerAdd',{v05DrawerAdd:'1'}));last('add','1',1);
fire(element('drawerBuy',{v05DrawerBuy:'1'}));assert.deepEqual(calls.slice(-2),[['add','1',1],['checkout']]);
fire(element('cart',{go:'cart'}));last('cartPage');fire(element('checkout',{go:'checkout'}));last('checkout');fire(element('place',{}));last('placeOrder');fire(element('product',{product:'rang-jued-tea'}));last('product','rang-jued-tea');
const transient=element('product',{product:'rang-jued-tea'});context.current='home';handlers.pointerdown({target:transient,pointerId:7,clientX:10,clientY:20});transient.isConnected=false;let recovered=0,stopped=0;handlers.pointerup({target:transient,pointerId:7,clientX:12,clientY:22,preventDefault(){recovered++},stopImmediatePropagation(){stopped++}});assert.equal(recovered,1);assert.equal(stopped,1);last('product','rang-jued-tea');
const scrolled=element('product',{product:'rang-jued-tea'});handlers.pointerdown({target:scrolled,pointerId:8,clientX:0,clientY:0});handlers.pointermove({target:scrolled,pointerId:8,clientX:30,clientY:0});scrolled.isConnected=false;const before=calls.length;handlers.pointerup({target:scrolled,pointerId:8,clientX:30,clientY:0,preventDefault(){},stopImmediatePropagation(){}});assert.equal(calls.length,before);
assert.match(source,/1\.7\.0/);assert.match(source,/data-v05-drawer-add/);assert.match(source,/v17Purchase/);assert.match(source,/stopImmediatePropagation/);assert.match(source,/pointerdown/);assert.match(source,/isConnected!==false/);
console.log('storefront interaction + redraw-resilient product tap smoke: OK');
