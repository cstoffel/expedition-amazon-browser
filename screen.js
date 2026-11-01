(function(exports){
  'use strict';
  class TextScreen {
    constructor(){this.cells=Array(960).fill(' ');this.styles=new Uint8Array(960);this.cursor=null;}
    write(row,col,text,style=0){
      let at=(row-1)*40+col-1;
      for(const char of String(text).toUpperCase()){
        if(char==='\n'){at=(Math.floor(at/40)+1)*40;continue;}
        if(at>=0&&at<960){this.cells[at]=char;this.styles[at]=style;}at++;
      }return this;
    }
    center(row,text,style=0){return this.write(row,Math.max(1,Math.floor((40-String(text).length)/2)+1),text,style);}
    clearRow(row){return this.write(row,1,' '.repeat(40));}
    inputCursor(row,col){this.cursor={row,col:Math.min(40,col)};return this;}
    transcript(){return Array.from({length:24},(_,r)=>this.cells.slice(r*40,r*40+40).join('').trimEnd()).join('\n').trim();}
    pixels(font,phase=true){
      const out=new Uint8ClampedArray(280*192*4);
      for(let cell=0;cell<960;cell++){
        const code=this.cells[cell].charCodeAt(0)&63,style=this.styles[cell];
        const inverse=style===1||(style===2&&phase);
        const cx=(cell%40)*7,cy=Math.floor(cell/40)*8;
        for(let y=0;y<8;y++)for(let x=0;x<7;x++){
          let on=Boolean(font[code*8+y]&(1<<(6-x)));if(inverse)on=!on;
          const i=((cy+y)*280+cx+x)*4;out[i]=out[i+1]=out[i+2]=on?255:0;out[i+3]=255;
        }
      }
      if(this.cursor&&phase){
        const x=(this.cursor.col-1)*7,y=(this.cursor.row-1)*8;
        for(let dy=0;dy<8;dy++)for(let dx=0;dx<7;dx++){const i=((y+dy)*280+x+dx)*4;out[i]=out[i+1]=out[i+2]=255;}
      }
      return out;
    }
  }
  exports.TextScreen=TextScreen;
})(typeof module==='object'?module.exports:(globalThis.AmazonScreen={}));
