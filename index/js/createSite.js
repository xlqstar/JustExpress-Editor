function initLocalStorage(){
  localStorage["file.list"] = ";file.article;";
  localStorage["file.article.content"] = "";
  localStorage["file.article.editorSelectRange"] = "3;0;3;0";
  localStorage["file.article.previewScrollTop"] = "75";
  localStorage["file.article.publish"] = ";";
  localStorage["file.article.selectTime"] = "1393933545040";
  localStorage["file.article.sync"] = ";";
  localStorage["file.article.title"] = "Welcome document";
  localStorage["folder.list"] = ";";
  localStorage["frontWindowId"] = "eun6m7";
  localStorage["version"] = "v17";
  localStorage["welcomeTour"] = "done";
}

function showBlock(blockName){
  for(k in blocks){
    var block = blocks[k];
    if (block == blockName) {
      $("#show_"+block).addClass("active");
      $("#"+block).show();
      var nextK = parseInt(k)+1;
      if (nextK == blocks.length) {
        $("#nextStep").click(function(){
          show(blocks[0]);
        })
      }else{
        $("#nextStep").click(function(){
          console.log(nextK);
          show(blocks[nextK]);
        })
      };
    }else{
      $("#show_"+block).removeClass("active");
      $("#"+block).hide();
    };
  }
};


function getLinksValue(){
  var keys = $( "input[name='siteName']" );
  var values = $( "input[name='siteLink']" );
  var links = [];
  if (keys.length == 0) {
    return false;
  };
  keys.each(function(i){
    var link = [];
    link.push($(this).val());
    link.push($(values[i]).val());
    link = link.join("@");
    links.push(link);
  });
  return links.join("|");
}

function getCategorysValue(){
  var keys = $( "input[name='categoryName']" );
  var values = $( "input[name='categoryAlias']" );
  var categorys = [];
  if (keys.length == 0) {
    return false;
  };
  keys.each(function(i){
    var category = "";
    var key = $(this).val();
    var value = $(values[i]).val();
    if (key == "相册" || value == "album") {
      category += "album";
    }else if (key == "文章" || value == "article") {
      category += "article";
    }else if ( value.indexOf("http://") >= 0){
      category += key + "@" + value;
    }else{
      category += key + "(" + value + ")";
    };
    categorys.push(category);
  });
  return categorys.join("|");
}

function getSocialsValue(){
  var keys = $( "input[name='socialName']" );
  var values = $( "input[name='socialLink']" );
  var links = [];
  keys.each(function(i){
    var link = [];
    link.push($(this).val());
    link.push($(values[i]).val());
    if (links.length == 0) {
      return false;
    };
    links.push(link);
  });
  return links.join("|");
}

function makeSetting(Config){
  var ConfigTmp = [];
  for(k in Config){
    configNode = Config[k];
    if (configNode.key == "site") {
      localStorage["site"] = configNode.value;
    };
    configNode = configNode.key + ":" + configNode.value;
    ConfigTmp.push(configNode);
  }
  return ConfigTmp.join("\r\n\r\n");
}