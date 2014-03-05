define([
    "jquery",
    "underscore",
    "utils",
    "classes/Extension",
], function($, _, utils, Extension) {

    //需要忽略的文件名列表
    var ignoreFiles = ['complied'];
    var oldTitle;
    var currentFileDesc;
    
    var justExpress = new Extension("justExpress", 'justExpress\'s hooks"', true, true);

    var fs = requireNode('fs');
    var path = requireNode('path');
    
/*    var fileMgr;
    justExpress.onFileMgrCreated = function(fileMgrParameter) {
        fileMgr = fileMgrParameter;
    };*/

    justExpress.toImgDir = function(fileDesc){
        var files = fs.readdirSync(workSpace);
        var fileName = justExpress.getFileName(fileDesc.title);
        var fullFileName = path.join(workSpace,fileName);
        var titleAndDate = fileName.split('.md')[0];
        var stat = fs.statSync(fullFileName);
        if (!stat.isDirectory()) {
            fs.mkdir( path.join( workSpace, titleAndDate), 777, function(){
                fs.renameSync( fullFileName, path.join(workSpace, titleAndDate, "article.md") );
                fs.mkdirSync( path.join( workSpace, titleAndDate, "images" ));
            });
        };
        var process = requireNode('child_process');
        process.exec("start " + path.join( workSpace, titleAndDate, "images" ));
    }

    justExpress.getFileName = function(title){
        var file;
        var files = fs.readdirSync(workSpace);
        for( key in files){
            file = files[key];
            if (_.contains(ignoreFiles,file)) {
                continue;
            };
            if (title == file.split('@')[0]) {
                return file;
            };
        }
        return false;
    }

    justExpress.saveContent = function(title,content){
        var fileName = justExpress.getFileName(title);
        var fullFileName = path.join(workSpace, fileName);
        var stat = fs.statSync(fullFileName);
        if (stat.isDirectory()) {
            fullFileName = path.join(fullFileName,"article.md");
        };
        fs.writeFile(fullFileName, content, function(e){//会先清空原先的内容
            if(e) throw e;
        })
    }

    justExpress.changeTitle = function(oldTitle,newTitle){
        console.log(oldTitle,newTitle);
        var oldFileName = justExpress.getFileName(oldTitle);
        var oldFullFileName = path.join(workSpace, oldFileName);
        var newFileName = newTitle + "@" +oldFileName.split("@")[1];
        var newFullFileName = path.join(workSpace, newFileName);
        fs.renameSync( oldFullFileName, newFullFileName );
    }

    justExpress.rmdirSync = (function(){
        function iterator(url,dirs){
            var stat = fs.statSync(url);
            if(stat.isDirectory()){
                dirs.unshift(url);//收集目录
                inner(url,dirs);
            }else if(stat.isFile()){
                fs.unlinkSync(url);//直接删除文件
            }
        }
        function inner(path,dirs){
            var arr = fs.readdirSync(path);
            for(var i = 0, el ; el = arr[i++];){
                iterator(path+"/"+el,dirs);
            }
        }
        return function(dir,cb){
            cb = cb || function(){};
            var dirs = [];
     
            try{
                iterator(dir,dirs);
                for(var i = 0, el ; el = dirs[i++];){
                    fs.rmdirSync(el);//一次性删除所有收集到的目录
                }
                cb()
            }catch(e){//如果文件或目录本来就不存在，fs.statSync会报错，不过我们还是当成没有异常发生
                e.code === "ENOENT" ? cb() : cb(e);
            }
        }
    })();
 

    justExpress.onFileSelected = function(fileDesc) {
        currentFileDesc = fileDesc;
        // oldTitle = justExpress.clone(fileDesc.title);
        oldTitle = fileDesc.title;
    };
    
    justExpress.onFileCreated = function(fileDesc){
        var dateObject = new Date();
        var year = dateObject.getFullYear();
        var month = dateObject.getMonth();
        var day = dateObject.getDate();
        var date = year + "-" + month + "-" + day;
        fs.writeFile(path.join(workSpace,fileDesc.title + "@" + date + ".md"),fileDesc.content,function(e){//会先清空原先的内容
            if(e) throw e;
        })
    }

    justExpress.onFileDeleted = function(fileDesc){
        var files = fs.readdirSync(workSpace);
        fileName = justExpress.getFileName(fileDesc.title);
        if (fileName) {
            justExpress.rmdirSync(path.join(workSpace, fileName));
        };
    }

    justExpress.onContentChanged = function(fileDesc){
        justExpress.saveContent(fileDesc.title, fileDesc.content);
    }

    justExpress.onTitleChanged = function(fileDesc){
        justExpress.changeTitle(oldTitle,fileDesc.title);
    }

    justExpress.onReady = function() {
        $(".action-to-imgdir").click(function() {
            justExpress.toImgDir(currentFileDesc);
        });        
    }


/*
    justExpress.toAttachDir = function(fileDesc){
        files = fs.readdirSync(workSpace);

        files.forEach(function(file){
            if (_.contains(ignoreFiles,file)) {
                continue;
            };
            var title = file.split('@')[0];
            var titleAndDate = file.split('.md')[0];

            if (title == fileDesc.title) {
                var stat = fs.statSync(path.join(workSpace,file));
                if (!stat.isDirectory()) {
                    fs.mkdir( path.join( workSpace, titleAndDate ), 777, function(){
                        fs.renameSync( path.join(workSpace,file), path.join(workSpace,file.split('.md')[0], "article.md") );
                    }); 
                }
                var process = requireNode('child_process');
                process.exec("start " + path.join( workSpace, titleAndDate ));
                break;
            };
        });
    }
*/


    return justExpress;

});