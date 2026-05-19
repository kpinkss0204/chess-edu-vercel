var _toastTimer=null;
function showToast(msg){
  var el=document.getElementById('toast');
  if(!el)return;
  el.textContent=msg;el.style.opacity='1';
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(function(){el.style.opacity='0';},2800);
}