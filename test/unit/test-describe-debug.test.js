import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

function makeW() {
  return { on:()=>{},key:()=>{},append:()=>{},setContent:()=>{},hidden:true,
           style:{},render:()=>{},program:{clear:()=>{}},clearRegion:()=>{},
           olines:[],cols:120,rows:40,emit:()=>{},focused:null,
           getContent:()=>'',setLabel:()=>{},show:()=>{},hide:()=>{},toggle:()=>{},
           focus:()=>{},up:()=>{},down:()=>{},scroll:()=>{},getScroll:()=>0,
           getScrollPerc:()=>0,setScrollPerc:()=>{},setItems:()=>{},clearItems:()=>{},
           addItem:()=>{},getItem:()=>null,select:()=>{},getValue:()=>'',
           setValue:()=>{},border:{type:'line'},items:[],ritems:[],selected:0 };
}
await mock.module('blessed', { defaultExport: { box:()=>makeW(),text:()=>makeW(),textbox:()=>makeW(),textarea:()=>makeW(),list:()=>makeW(),listbar:()=>makeW(),button:()=>makeW(),prompt:()=>makeW(),screen:()=>makeW(),escape:(s)=>s||'' } });

test('top-level test', () => { assert.ok(true); });

describe('my describe', () => {
  test('inside describe', () => { assert.ok(true); });
});
