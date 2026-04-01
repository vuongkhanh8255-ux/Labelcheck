// Map.prototype.getOrInsertComputed polyfill (ES2025)
// Runs before ANY other JavaScript
(function(){
  if(typeof Map!=='undefined'){
    if(!Map.prototype.getOrInsertComputed){
      Map.prototype.getOrInsertComputed=function(k,cb){
        if(this.has(k))return this.get(k);
        var v=cb(k);this.set(k,v);return v;
      };
    }
    if(!Map.prototype.getOrInsert){
      Map.prototype.getOrInsert=function(k,dv){
        if(this.has(k))return this.get(k);
        this.set(k,dv);return dv;
      };
    }
  }
})();
