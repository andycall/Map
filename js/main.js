var mapObj = (function(){
    var mapObj = {},
        d = document;

    return function(config){
        var autoComplete  = config.autoComplete;
        var drag = config.drag;
        // 自动补全模块 + 地图响应
        if(autoComplete){

            autoComplete.windowsArr = [];
            autoComplete.marker     = [];

            autoComplete.keydown = function(){
                var self = this,
                    input = self.input,
                    result = self.result;

                var key = (event||window.event).keyCode;
                var result = d.getElementById(result);

                var cur = result.curSelect;
                if(key===40){//down
                    if(cur + 1 < result.children.length){
                        if(result.children[cur]){
                            result.children[cur].style.background='';
                        }
                        result.curSelect=cur+1;
                        result.children[cur+1].style.background='#CAE1FF';
                        d.getElementById(input).value = result.tipArr[cur+1].name;
                    }
                }else if(key===38){//up
                    if(cur-1>=0){
                        if(result.children[cur]){
                            result.children[cur].style.background='';
                        }
                        result.curSelect=cur-1;
                        result.children[cur-1].style.background='#CAE1FF';
                        d.getElementById(input).value = result.tipArr[cur-1].name;
                    }
                }else if(key === 13){
                    //debugger;
                    var res = d.getElementById(input);
                    if(res && res['curSelect'] !== -1){
                        self.selectResult(result.curSelect);
                    }
                }else{
                    self.autoSearch();
                }
            };

            //输入提示
            autoComplete.autoSearch = function(){
                var self = this,
                    input = self.input,
                    result = self.result;

                var keywords = d.getElementById(input).value;
                var auto;
                //加载输入提示插件
                mapObj.plugin(["AMap.Autocomplete"], function() {
                    var autoOptions = {
                        city: "" //城市，默认全国
                    };
                    auto = new AMap.Autocomplete(autoOptions);
                    //查询成功时返回查询结果
                    if ( keywords.length > 0) {
                        AMap.event.addListener(auto,"complete", function(data){
                            self.autocomplete_CallBack.call(self, data);
                        });
                        auto.search(keywords);
                    }
                    else {
                        d.getElementById(result).style.display = "none";
                    }
                });
            };

            //输出输入提示结果的回调函数
            autoComplete.autocomplete_CallBack = function(data){
                var self = this,
                    input = $('#' + self.input),
                    result = $("#" + self.result);

                var resultStr = "";
                var tipArr = data.tips;
                if (tipArr&&tipArr.length>0) {
                    //for (var i = 0; i < tipArr.length; i++) {
                    //    resultStr += "<div class='divid' id='divid"  + (i + 1) + "' data-mouseover=" + (i + 1)
                    //    + " data-select=" + i + " data-mouseout=" + (i + 1)
                    //     + "data=" + tipArr[i].adcode + ">" + tipArr[i].name + "<span style='color:#C1C1C1;'>"+ tipArr[i].district + "</span></div>";
                    //}
                    resultStr = _.template($("#list_template").html())({ tipArr : tipArr});
                }

                result[0].curSelect = -1;
                result[0].tipArr = tipArr;
                result.html(resultStr);
                result[0].style.display = "block";

                result.on('mouseover', function(ev){
                    var target = ev.target;
                    if(target.className == 'divid'){
                        //console.log(target);
                        var dataMouseover = target.dataset['mouoseover'];
                        self.openMarkerTipById(dataMouseover, target);
                    }
                });

                result.on('mouseout', 'div', function(ev){
                    var target = ev.target;
                    if(target.className == 'divid'){
                        //console.log(target);
                        var dataMouseOut = target.dataset['mouseout'];
                        self.onmouseout_MarkerStyle(dataMouseOut, target);
                    }
                });

                result.on('click', 'div', function(ev){
                    var target = ev.target;

                    if(target.className == 'divid'){
                        var dataClick = parseInt(target.dataset['select']);
                        self.selectResult(dataClick);
                    }
                });

            };

            //输入提示框鼠标滑过时的样式
            autoComplete.openMarkerTipById = function(pointid, self){
                self.style.background = '#CAE1FF';
            };

            //输入提示框鼠标移出时的样式
            autoComplete.onmouseout_MarkerStyle = function(pointid, self){
                self.style.background = "";
            };

            //从输入提示框中选择关键字并查询
            autoComplete.selectResult = function (index) {
                var self = this,
                    input = self.input,
                    result = self.result;

                if(index<0){
                    return;
                }
                if (navigator.userAgent.indexOf("MSIE") > 0) {
                    d.getElementById(input).onpropertychange = null;
                    d.getElementById(input).onfocus = self.focus_callback;
                }
                //截取输入提示的关键字部分
                //debugger;

                var text = d.getElementById("divid" + (index + 1)).innerHTML.replace(/\s|<[^>].*?>.*<\/[^>].*?>/g,"");

                var cityCode = d.getElementById("divid" + (index + 1)).getAttribute('data');
                console.log(text);
                d.getElementById(input).value = text;
                d.getElementById(result).style.display = "none";
                //根据选择的输入提示关键字查询
                mapObj.plugin(["AMap.PlaceSearch"], function() {
                    var msearch = new AMap.PlaceSearch();  //构造地点查询类
                    AMap.event.addListener(msearch, "complete", self.placeSearch_CallBack); //查询成功时的回调函数
                    msearch.setCity(cityCode);
                    msearch.search(text);  //关键字查询查询
                });
            };

            //定位选择输入提示关键字
            autoComplete.focus_callback = function() {
                var self = this,
                    input = self.input,
                    result = self.result;

                if (navigator.userAgent.indexOf("MSIE") > 0) {
                    document.getElementById(input).onpropertychange = self.autoSearch;
                }
            };

            //输出关键字查询结果的回调函数
            autoComplete.placeSearch_CallBack = function(data){
                var self = autoComplete,
                    input = $("#" + self.input),
                    result = $("#" + self.result)

                //清空地图上的InfoWindow和Marker

                mapObj.clearMap();

                var resultStr1 = "";
                var poiArr = data.poiList.pois;
                var resultCount = poiArr.length;
                for (var i = 0; i < resultCount; i++) {
                    resultStr1 += "<div class='secid' id='divid" + (i + 1) + "' data-mouseover=" + i + " data-mouseout=" + (i + 1) + "><table><tr><td><img src=\"http://webapi.amap.com/images/" + (i + 1) + ".png\"></td>" + "<td><h3><font color=\"#00a6ac\">名称: " + poiArr[i].name + "</font></h3>";

                    resultStr1 += autoComplete.TipContents(poiArr[i].type, poiArr[i].address, poiArr[i].tel) + "</td></tr></table></div>";
                    autoComplete.addmarker(i, poiArr[i]);
                }
                mapObj.setFitView();
                result[0].innerHTML = resultStr1;
                result[0].style.display = "block";

                result.on('mouseover', 'div', function(ev){
                    var target = ev.currentTarget;

                    if(target.className == 'secid'){
                        var dataMouseover = parseInt(target.dataset['mouseover']);
                        self.openMarkerTipById1(dataMouseover, target);
                    }
                });

                result.on('mouseout', 'div', function(ev){
                    var target = ev.currentTarget;

                    if(target.className == 'secid'){
                        var dataMouseOut = target.dataset['mouseout'];
                        self.onmouseout_MarkerStyle(dataMouseOut, target);
                    }
                });


            };

            //鼠标滑过查询结果改变背景样式，根据id打开信息窗体
            autoComplete.openMarkerTipById1 = function(pointid, self){
                self.style.background = '#CAE1FF';
                //debugger;
                autoComplete.windowsArr[pointid].open(mapObj, autoComplete.marker[pointid]);
            };

            autoComplete.addmarker = function(i, d){
                var self = this,
                    input = self.input,
                    result = self.result;

                var lngX = d.location.getLng();
                var latY = d.location.getLat();
                var markerOption = {
                    map:mapObj,
                    icon:"http://webapi.amap.com/images/" + (i + 1) + ".png",
                    position:new AMap.LngLat(lngX, latY)
                };
                var mar = new AMap.Marker(markerOption);
                autoComplete.marker.push(new AMap.LngLat(lngX, latY));

                var infoWindow = new AMap.InfoWindow({
                    content:"<h3><font color=\"#00a6ac\">  " + (i + 1) + ". " + d.name + "</font></h3>" + autoComplete.TipContents(d.type, d.address, d.tel),
                    size:new AMap.Size(300, 0),
                    autoMove:true,
                    offset:new AMap.Pixel(0,-30)
                });
                autoComplete.windowsArr.push(infoWindow);
                var aa = function (e) {infoWindow.open(mapObj, mar.getPosition());};
                AMap.event.addListener(mar, "click", aa);
            };

            autoComplete.TipContents = function(type, address, tel){
                var self = this,
                    input = self.input,
                    result = self.result;

                if (type == "" || type == "undefined" || type == null || type == " undefined" || typeof type == "undefined") {
                    type = "暂无";
                }
                if (address == "" || address == "undefined" || address == null || address == " undefined" || typeof address == "undefined") {
                    address = "暂无";
                }
                if (tel == "" || tel == "undefined" || tel == null || tel == " undefined" || typeof address == "tel") {
                    tel = "暂无";
                }
                var str = "  地址：" + address + "<br />  电话：" + tel + " <br />  类型：" + type;

                return str;
            };
        }
        else{
            $('.search').css('display', 'none');
        }


        if(config.drag){
            drag.abc = function(){

            }
        }

        mapObj.init = function(){

            mapObj = new AMap.Map("container",{
                view: new AMap.View2D({
                    center:new AMap.LngLat(106.53791,29.549537),//地图中心点
                    zoom:12 //地图显示的缩放级别
                }),
                keyboardEnable:false
            });

            if(config.autoComplete){
                //d.getElementById(config.autoComplete.input).addEventListener('keyup', function(){
                //    autoComplete.keydown.call(config.autoComplete);
                //}, false);
                $("#" + config.autoComplete.input).on('keyup', function(){
                    autoComplete.keydown.call(config.autoComplete);
                });
            }

            return mapObj;
        };

        if(drag){
            (function (){
                var _dNode = $('.drag-pin'),
                    _cont = $('.container'),
                    _patchDragWrapOffset = _dNode.offset();

                _dNode.mousedown(function(){
                    var _patchH = parseInt($(this).css('height')) / 2,
                        _patchW = parseInt($(this).css('width')) / 2;
                    _dNode.addClass('drag-ing');
                    _cont.mousemove(function(eve){
                        var _x = eve.clientX,
                            _y = eve.clientY,
                            _patchContOffset = _cont.offset();
                            l = _x - _patchDragWrapOffset.left - _patchContOffset.left - _patchW,  //相对于 drag-wrap 的位置
                            t = _y - _patchDragWrapOffset.top - _patchContOffset.top - _patchH;
                        console.log(eve, _patchDragWrapOffset, _patchContOffset);
                        _dNode.css({top: t, left: l});

                        _cont.mouseup(function(){
                            $(this).unbind('mousemove');
                            _dNode.removeClass('drag-ing');
                        })
                    });

                });
            })();
        }else{
            $('.drap-main').css('display', 'none');
        }
        return mapObj;
    }
}());