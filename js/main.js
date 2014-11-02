var mapObj = (function(){
    var mapObj = new AMap.Map("container",{
            view: new AMap.View2D({
                center:new AMap.LngLat(106.53791,29.549537),//地图中心点
                zoom:12 //地图显示的缩放级别
            }),
            keyboardEnable:false
        }),
        d = document,
        city_location = "重庆",
        city_bound = {};

    // 获取用户位置信息
    mapObj.getCityInfo = (function(){
        mapObj.plugin(["AMap.CitySearch"], function() {
            //实例化城市查询类
            var citysearch = new AMap.CitySearch();
            //自动获取用户IP，返回当前城市
            citysearch.getLocalCity();
            //citysearch.getCityByIp("123.125.114.*");
            AMap.event.addListener(citysearch, "complete", function(result){
                if(result && result.city && result.bounds) {
                    city_location = result.city;
                    city_bound = result.bounds;
                }
                else {
                    document.getElementById('info').innerHTML = "您当前所在城市："+result.info+"";
                }
            });
            AMap.event.addListener(citysearch, "error", function(result){alert(result.info);});
        });
    })();


    // 逆地理编码
    mapObj.getCoder = function(){

    };


    //mapObj.getPlace = function(X, Y){
    //    var cpoint = new AMap.LngLat(X, Y);
    //
    //    var MSearch;
    //    //加载服务插件，实例化地点查询类
    //    mapObj.plugin(["AMap.PlaceSearch"], function() {
    //        MSearch = new AMap.PlaceSearch({
    //            city: city_location
    //        });
    //        //查询成功时的回调函数
    //        AMap.event.addListener(MSearch, "complete", placeSearch_CallBack);
    //        //周边搜索
    //        MSearch.searchNearBy("餐厅", cpoint, 500);
    //    });
    //
    //};



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
                d.getElementById(input).value = text;
                d.getElementById(result).style.display = "none";
                //根据选择的输入提示关键字查询
                mapObj.plugin(["AMap.PlaceSearch"], function() {
                    var msearch = new AMap.PlaceSearch();  //构造地点查询类
                    AMap.event.addListener(msearch, "complete", self.placeSearch_CallBack); //查询成功时的回调函数
                    msearch.setCity(cityCode);
                    msearch.search(text);  //关键字查询
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
                    city = $("#" + self.city);

                //清空地图上的InfoWindow和Marker

                mapObj.clearMap();

                var resultStr1 = "";
                var poiArr = data.poiList.pois;
                var resultCount = poiArr.length;

                resultStr1 = _.template($("#place_template").html())({
                    resultCount : resultCount,
                    autoComplete : autoComplete,
                    poiArr      : poiArr
                });
                mapObj.setFitView();

                city.html(resultStr1);
                city.show();

                city.on('mouseover', 'li', function(ev){
                    var target = ev.currentTarget;
                    if(target.className == 'secid'){
                        var dataMouseover = parseInt(target.dataset['mouseover']);
                        self.openMarkerTipById(dataMouseover, target);
                    }
                });

                city.on('mouseout', 'li', function(ev){
                    var target = ev.currentTarget;
                    if(target.className == 'secid'){
                        var dataMouseOut = target.dataset['mouseout'];
                        self.onmouseout_MarkerStyle(dataMouseOut, target);
                    }
                });

                city.on('click', 'li', function(ev){
                    var target = ev.currentTarget;
                    if(target.className == 'secid'){
                        var dataMouseover = parseInt(target.dataset['mouseover']);
                        self.openMarkerTipById1(dataMouseover, target, resultCount);
                    }
                });
            };

            //鼠标滑过查询结果改变背景样式，根据id打开信息窗体
            autoComplete.openMarkerTipById1 = function(pointid, that, resultCount){
                that.style.background = '#CAE1FF';
                autoComplete.windowsArr[pointid].open(mapObj, autoComplete.marker[pointid]);

                for(var i = 0; i < resultCount; i ++){
                    $(".icon" + (i + 1)).each(function(index, value){
                        value.className = "icon icon" + ( i + 1 ) + "_b";
                    });
                }

                $(".icon" + (parseInt(pointid) + 1) + "_b").each(function(index, value){
                    value.className = "icon icon" + (parseInt(pointid) + 1);
                });
            };

            autoComplete.onmouseout_iconStyle = function(pointid, self){
                self.style.background = "";
//                $(self).find('.icon')[0].className = "icon icon" + (parseInt(pointid)) + "_b";
                $(".icon" + (parseInt(pointid))).each(function(index, value){
                    value.className = "icon icon" + pointid + "_b";
                });
            };

            autoComplete.addmarker = function(i, d){
                var self = this,
                    input = self.input,
                    result = self.result;

                var lngX = d.location.getLng();
                var latY = d.location.getLat();
                var markerOption = {
                    map:mapObj,
                    content : "<div class='icon icon" +  ( i + 1 )+ "_b'></div>",
                    position:new AMap.LngLat(lngX, latY)
                };
                var mar = new AMap.Marker(markerOption);
                autoComplete.marker.push(new AMap.LngLat(lngX, latY));

                var windowTemplate = _.template($("#windowInfo_template").html())({
                    i : i,
                    d : d
                });

                var infoWindow = new AMap.InfoWindow({
                    content: windowTemplate,
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

        mapObj.init = function(){
            var self = this;
            if(config.autoComplete){
                $("#" + config.autoComplete.input).on('keyup', function(){
                    autoComplete.keydown.call(config.autoComplete);
                });
            }


        };

        if(drag){
            (function (){
                var _dNode = $('.drag-pin'),
                    _cont = $('.container'),
                    _patchDragOriOffset = _dNode.offset();

                function mousedown(eve){
                    var _patchH = parseInt($(this).css('height')),
                        _patchW = parseInt($(this).css('width')) / 2;
                    _dNode.addClass('drag-ing');
                    var _patchContOffset = _cont.offset(),
                        _patchDragWrapOffset;

                    _cont.on('mousemove', mousemove(_patchH, _patchW, _patchContOffset, _patchDragWrapOffset));
                    _cont.on('mouseup', mouseup(_patchH, _patchW, _patchContOffset, _patchDragWrapOffset));
                }

                function mousemove(_patchH, _patchW, _patchContOffset, _patchDragWrapOffset){
                    return function(eve){
                        var _x = eve.clientX,
                            _y = eve.clientY,
                            _patchDragWrapOffset = _dNode.offset(),

                            l = _x - _patchContOffset.left - _patchDragOriOffset.left - _patchW,  //相对于 drag-wrap 的位置
                            t = _y - _patchContOffset.top - _patchDragOriOffset.top - _patchH;
                        _dNode.css({top: t, left: l});
                    }
                }

                function mouseup(_patchH, _patchW, _patchContOffset, _patchDragWrapOffset){
                    return function(eve) {
                        _dNode.removeClass('drag-ing');
                        var containerPixelPos = fromContainerPixelToLngLat(_dNode.offset().left - _patchContOffset.left, _dNode.offset().top - _patchContOffset.top + _patchH)
//                        console.log(_dNode.offset().left - _patchContOffset.left, _dNode.offset().top - _patchContOffset.top);
                        _dNode.attr('data-lat', containerPixelPos.lat);
                        _dNode.attr('data-lng', containerPixelPos.lng);
                        var marker = new AMap.Marker({
                            icon: new AMap.Icon({    //复杂图标
                                size: new AMap.Size(28, 34),//图标大小
                                image: "image/map-sprites.png", //大图地址
                                imageOffset: new AMap.Pixel(0, -140)//相对于大图的取图位置
                            }),
                            position: new AMap.LngLat(containerPixelPos.lng, containerPixelPos.lat),
                            draggable:true, //点标记可拖拽
                            cursor:'move',  //鼠标悬停点标记时的鼠标样式
                            raiseOnDrag: true//鼠标拖拽点标记时开启点标记离开地图的效果
                        });
                        marker.setMap(mapObj);  //在地图上添加点
                        _cont.off('mousemove');
                        _cont.off('mouseup');
                        _dNode.css({top: 0, left: 0});
                    }
                }

                _dNode.on('mousedown', mousedown);

                function fromContainerPixelToLngLat (left, top){
                    var ll = mapObj.containTolnglat(new AMap.Pixel(left ,top));
                    return {lng: ll.getLng(), lat: ll.getLat()};
                }

                function fromLngLatToContainerPixel (lng, lat) {
                    var pixel = mapObj.lnglatTocontainer(new AMap.LngLat(lng, lat));
                    return {x: pixel.getX(), y: pixel.getY()};
                }

//                var marker = new AMap.Marker({
//                    position: mapObj.getCenter(),
//                    draggable:true, //点标记可拖拽
//                    cursor:'move',  //鼠标悬停点标记时的鼠标样式
//                    raiseOnDrag:true//鼠标拖拽点标记时开启点标记离开地图的效果
//
//                });
//                marker.setMap(mapObj);
                //TODO for debug
                //AMap.event.addListener(mapObj, 'click', function(e){
                //    console.log(e.lnglat.getLng(), e.lnglat.getLat());
                //});

            })();
        }else{
            $('.drap-main').css('display', 'none');
        }
        return mapObj;
    }
}());
