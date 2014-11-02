/**
 * @desc grunt配置文件
 * @author zhaoyang
 * @date 2014-11-1
 * @new 避免每次操作全局压缩，目前只对修改的静态文件进行压缩操作
 */

module.exports = function(grunt) {

    grunt.initConfig({
        //读取配置文件信息
        config: grunt.file.readJSON('grunt.config.json'),

        //文件修改监控
        watch: {
            options: {
                spawn: false,
            },
            files: ['<%= config.js %>','<%= config.css %>']
        }
    });

    //对watch插件的watch事件进行监听，进行针对处理
    grunt.event.on("watch",function(type,src){
        var data = grunt.config.data,
            depth = data.config.depth || 1,
            needTag = data.config.needTag || false,
            imgDir = getDirPathFromSrc(src),
            ext = getExtFromSrc(src),
            isJ = ["js","json"].indexOf(ext) != -1,
            isC = "css" === ext,
            runMap = [];

        if((isJ || isC) & needTag)
        {
            data.clean = {
                build: {
                    expand: true,
                    filter: "isFile",
                    src: getCleanDir(src,depth)
                }
            };

            runMap.push("clean");
        }


        if(isJ)
        {
            data.jshint = {
                options: {
                    globals: {
                        jQuery: true,
                        console: true,
                        module: true
                    }
                },
                files: [src],
            };

            data.uglify = {
                compress: {
                    files: [
                        {
                            expand: true,
                            filter: 'isFile',
                            src: src,
                            rename: getPathFromDepth("public/js", src, depth,needTag)
                        }
                    ]
                },
                beatify: {
                    options: {
                        beautify: true
                    },
                    files: [
                        {
                            expand: true,
                            filter: 'isFile',
                            src: src
                        }]
                }
            };

            runMap.push("jshint");
            runMap.push("uglify");
        }

        if(isC)
        {
            data.cssmin = {
                compress: {
                    files: [
                        {
                            expand: true,
                            filter: 'isFile',
                            src: src,
                            rename: getPathFromDepth("public/css", src, depth)
                        }]
                }
            }
            runMap.push("cssmin");
        }

        data.imagemin = {
            static: {
                files: [{
                    expand: true,
                    filter: 'isFile',
                    src: [imgDir + "**/*.{jpg,png,gif}"],
                    dest: "public/images"
                }]
            }
        };
        runMap.push("imagemin");

        grunt.config.data = data;
        grunt.task.run(runMap);
    });

    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.registerTask('default', ['watch']);

    /**---------------下面是辅助函数，不要随意修改--------------**/
    function getPathFromDepth(dest,src,depth,needTag)
    {
        return function(){
            var i = depth,
                path = src,
                time = +new Date(),
                iIndex,lIndex,tag;

            //去除头尾的空格
            src = src.replace(/^\/|\/$/g,'');

            //根据编译深度进行目标路径截取
            while(i--){
                iIndex = src.indexOf("/");

                if(iIndex == -1){
                    break;
                }

                src = src.slice(iIndex+1);
            };

            lIndex = src.lastIndexOf(".");

            //拼接含有时间戳的目标路径
            tag = needTag ? "-" + time : '';
            src = src.slice(0,lIndex) + tag + src.slice(lIndex);

            return dest + "/" + src;
        }
    }

    function getExtFromSrc(src)
    {
        var lIndex;

        //去除多余干扰字符
        src = src.replace(/[\/ ]+$/g,'');
        lIndex = src.lastIndexOf(".");

        if(lIndex != -1)
        {
            return src.slice(lIndex+1);
        }
    }

    function getDirPathFromSrc(src)
    {
        var lIndex;

        //去除多余干扰字符
        src = src.replace(/[\/ ]+$/g,'');
        lIndex = src.lastIndexOf("/");

        return src.lastIndexOf("/") != -1 ? src.slice(0,lIndex+1) : "/";
    }

    function getCleanDir(src,depth)
    {
        var ext = getExtFromSrc(src),
            dest = "public/" + ext,
            iIndex,lIndex;

        src = src.replace(/[\/ ]+$/g,'');
        src = getPathFromDepth(dest,src,depth)();
        return src.split("-")[0] + "-*." + ext;

    }

};