var mapObj = (function(){
    var mapObj = new AMap.Map("container",{
            view: new AMap.View2D({
                zoom:12 //地图显示的缩放级别
            }),
            keyboardEnable:false
        }),
        d = document,
        city_location = "重庆", // 默认位置
        city_bound = {}; // 初始位置信息

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
                    city_location = result.info;
                }
            });
            AMap.event.addListener(citysearch, "error", function(result){alert(result.info);});
        });
    })();

    // 逆地理编码
    mapObj.getCoder = function(X, Y, callback){
        var lnglatXY = new AMap.LngLat(X, Y);

        mapObj.plugin(["AMap.Geocoder"], function() {
            MGeocoder = new AMap.Geocoder({
                radius: 1000,
                extensions: "all"
            });
            //返回地理编码结果
            AMap.event.addListener(MGeocoder, "complete", callback);
            //逆地理编码
            MGeocoder.getAddress(lnglatXY);
        });
    };

    // 坐标信息显示框
    mapObj.pointWindow = function(X, Y){
        var self = this;

        self.getCoder(X, Y, function(data){
            //debugger;
            console.log(data);
            var template = _.template($("#point_template").html())({
                data : data.regeocode.addressComponent
            });

            var infoWindow = new AMap.InfoWindow({
                content: template,
                size:new AMap.Size(300, 0),
                autoMove: true,
                offset:new AMap.Pixel(0,-30)
            });
            infoWindow.open(mapObj, new AMap.LngLat(X, Y))
        });
    };

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

                var text = d.getElementById("divid" + (index + 1)).innerHTML.replace(/\s|<[^>].*?>.*<\/[^>].*?>/g,"");

                var cityCode = d.getElementById("divid" + (index + 1)).getAttribute('data');
                d.getElementById(input).value = text;
                d.getElementById(result).style.display = "none";
                //根据选择的输入提示关键字查询
                mapObj.plugin(["AMap.PlaceSearch"], function() {
                    var msearch = new AMap.PlaceSearch({
                        pageSize : 40
                    });  //构造地点查询类
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

            autoComplete.render = function(){
                var self = this,
                    city = $("#" + self.city),
                    poil = self.poil;

                console.log(self.resultIndex, self.resultEnd);
                var poiArr = poil.slice(self.resultIndex, self.resultEnd);


                var resultCount = poil.length / 10;

                var resultStr1 = _.template($("#place_template").html())({
                    resultCount : resultCount,
                    resultIndex : self.resultIndex,
                    autoComplete : self,
                    poiArr      : poiArr,
                    poil        : poil
                });


                mapObj.setFitView();

                city.html(resultStr1);
                city.show();

                $(".nextGroup").on('click', self.bindNext);
                $(".prevGroup").on('click', self.bindPrev);

            };

            autoComplete.bindNext = function(ev){
                var self = autoComplete,
                    city = $("#" + self.city),
                    currentTarget = ev.currentTarget;

                if(!currentTarget.className == "nextGroup") return;

                self.resultIndex += 10;
                self.resultEnd += 10;

                if(self.resultEnd > self.poil.length){
                    self.resultEnd = self.poil.length;
                }

                self.changePage(self.resultIndex, self.resultEnd);
                self.render();

                city.animate({
                    scrollTop : 0
                });
            };

            autoComplete.bindPrev = function(ev){
                var self = autoComplete,
                    city = $("#" + self.city),
                    currentTarget = ev.currentTarget;

                if(!currentTarget.className == "prevGroup") return;

                self.resultIndex -= 10;
                self.resultEnd -= 10;

                self.changePage(self.resultIndex, self.resultEnd);
                self.render();

                city.animate({
                    scrollTop : 0
                });
            };

            //输出关键字查询结果的回调函数
            autoComplete.placeSearch_CallBack = function(data){
                var self = autoComplete,
                    input = $("#" + self.input),
                    city = $("#" + self.city);

//                console.log(data);
                // 清空搜索缓存

                // 向后端要订餐的数据

                var restaurant = [];

                var poil = data.poiList.pois;

                for(var i = 0,len = poil.length; i < len; i ++){
                    restaurant.push([poil[i].location.A, poil[i].location.D]);
                }

                var restaurantResult = [];

                autoComplete.windowsArr = [];
                autoComplete.marker = [];
                autoComplete.data = data;
                autoComplete.resultIndex = 0;
                autoComplete.resultEnd  = 10;
                autoComplete.poil = poil;
                autoComplete.restaurantResult = restaurantResult;

                //清空地图上的InfoWindow和Marker
                mapObj.clearMap();

                self.render();

                if(drag){
                    $(".drag-wrap").css({left : 450});
                    drag.funcs.updateDragPosition();
                }

                city.on('mouseover', 'li', function(ev){
                    var target = ev.currentTarget;
                    if(target.className == 'secid'){
                        var dataMouseover = parseInt(target.dataset['mouseover']);
                        self.openMarkerTipById(dataMouseover, target);
                    }
                });


                $("#search_list").on('click', 'span' , self.bindNext);
                $(".prevGroup").on('click', self.bindPrev);

                city.on('mouseout', 'li', function(ev){
                    var target = ev.currentTarget;
                    if(target.className == 'secid'){
                        var dataMouseOut = target.dataset['mouseout'];
                        self.onmouseout_MarkerStyle(dataMouseOut, target);
                    }
                });

//                city.on('click', 'li', function(ev){
//                    var target = ev.currentTarget;
//                    if(target.className != 'secid') return;
//                    console.log(2);
//
//
//                    var dataMouseover = parseInt(target.dataset['mouseover']);
//                    console.log(dataMouseover);
//                    self.openMarkerTipById1(dataMouseover, target, resultCount);
//
//                });
            };

            //鼠标滑过查询结果改变背景样式，根据id打开信息窗体
            autoComplete.openMarkerTipById1 = function(pointid, that, resultCount){

                if(that){
                    that.style.background = '#CAE1FF';
                }

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



            autoComplete.changePage = function(start, end){
                autoComplete.windowsArr[start].open(mapObj, autoComplete.marker[start]);
                for(var i = 0; i < end - start; i ++){
                    $(".icon" + (i + 1)).each(function(index, value){
                        value.className = "icon icon" + ( i + 1 ) + "_b";
                    });
                }

                $(".icon" + (parseInt(start) + 1) + "_b").each(function(index, value){
                    value.className = "icon icon" + (parseInt(start) + 1);
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
            drag.funcs = (function (){
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
                        var containerPixelPos = fromContainerPixelToLngLat(_dNode.offset().left - _patchContOffset.left, _dNode.offset().top - _patchContOffset.top + _patchH);
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

                        //实例化信息窗体
                        var infoWindow = new AMap.InfoWindow({
                            isCustom: true,  //使用自定义窗体
                            content: mapObj.pointWindow(containerPixelPos.lng, containerPixelPos.lat),
                            offset: new AMap.Pixel(110, -25)//-113, -140
                        });

                        AMap.event.addListener(marker, 'mouseup', function(){ //鼠标点击marker弹出自定义的信息窗体
                            var e = window.event, o = marker.getPosition();
                            console.log(o);
                            var containerPixelPos = fromContainerPixelToLngLat(o.lng, o.lat)
                            var infoWindow = new AMap.InfoWindow({
                                isCustom: true,  //使用自定义窗体
                                content: mapObj.pointWindow(containerPixelPos.lng, containerPixelPos.lat),
                                offset: new AMap.Pixel(110, -25)//-113, -140
                            });
                        });

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

                //TODO for debug
                //AMap.event.addListener(mapObj, 'click', function(e){
                //    console.log(e.lnglat.getLng(), e.lnglat.getLat());
                //});
                return {
                    updateDragPosition: function (){
                        _patchDragOriOffset = _dNode.offset();
                        _patchDragOriOffset.left -= _cont.offset().left;
                    }
                };
            })();
        }else{
            $('.drap-main').css('display', 'none');
        }
        return mapObj;
    }
}());
