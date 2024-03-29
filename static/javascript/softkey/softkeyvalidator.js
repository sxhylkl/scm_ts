/**
 * Created by liubf on 2016-4-13.
 */

function SoftKeyValidator(call,check_url){
    var bConnect=0;
    var key_id = '';
    var user_name = '';
    var user_pwd = '';
    var enc_data = '';
    var rnd = '';
    var localMacAddr='';
    var macAddr = '';

    SoftKeyValidator.toHex = function( n ) {
        var digitArray = new Array('0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f');
        var result = '';
        var start = true;
        for ( var i=32; i>0; ) {
            i -= 4;
            var digit = ( n >> i ) & 0xf;
            if (!start || digit != 0) {
                start = false;
                result += digitArray[digit];
            }
        }
        return ( result == '' ? '0' : result );
    }

    SoftKeyValidator.random = function(){
        var number1 = parseInt(Math.random()*65535)+1;
        var number2 = parseInt(Math.random()*65535)+1;
        rnd = number1.toString()+number2.toString();
    }

    this.loadSoftKey = function(){
        //如果是IE10及以下浏览器，则跳过不处理
        if(navigator.userAgent.indexOf("MSIE")>0 && !navigator.userAgent.indexOf("opera") > -1) return;
        try
        {
            var s_pnp=new SoftKey3W();

             s_pnp.Socket_UK.onopen = function()
            {
                bConnect=1;//代表已经连接，用于判断是否安装了客户端服务
            };

            //在使用事件插拨时，注意，一定不要关掉Sockey，否则无法监测事件插拨
            s_pnp.Socket_UK.onmessage =function got_packet(Msg)
            {
                var PnpData = JSON.parse(Msg.data);
                if(PnpData.type=="PnpEvent")//如果是插拨事件处理消息
                {
                    if(PnpData.IsIn)
                    {
                        //alert("UKEY已被插入，被插入的锁的路径是："+PnpData.DevicePath);
                        alert("UKEY已被插入");
                    }else{
                        alert("UKEY已被拨出");
                    }
                }
            };

            s_pnp.Socket_UK.onclose = function(){};
        }catch(e){
            alert(e.name + ": " + e.message);
            return false;
        }
    }

    this.checkKey = function(func,param,ucode){
        //获得随机数
        SoftKeyValidator.random();
        //如果是IE10及以下浏览器，则使用AVCTIVEX控件的方式
        if(navigator.userAgent.indexOf("MSIE")>0 && !navigator.userAgent.indexOf("opera") > -1) return Handle_IE10(rnd,func,param,ucode);
       //判断是否安装了服务程序，如果没有安装提示用户安装
        if(bConnect==0)
        {
            window.alert ( "未能连接服务程序，请确定服务程序是否安装。");
            return false;
        }

        var DevicePath,ret,n,mylen,ID_1,ID_2,addr;
        try{
            //由于是使用事件消息的方式与服务程序进行通讯，
            //好处是不用安装插件，不分系统及版本，控件也不会被拦截，同时安装服务程序后，可以立即使用，不用重启浏览器
            //不好的地方，就是但写代码会复杂一些
            var s_simnew1=new SoftKey3W(); //创建UK类

            s_simnew1.Socket_UK.onopen = function() {
                s_simnew1.ResetOrder();//这里调用ResetOrder将计数清零，这样，消息处理处就会收到0序号的消息，通过计数及序号的方式，从而生产流程
            };

            //写代码时一定要注意，每调用我们的一个UKEY函数，就会生产一个计数，即增加一个序号，较好的逻辑是一个序号的消息处理中，只调用我们一个UKEY的函数
            s_simnew1.Socket_UK.onmessage =function got_packet(Msg)
            {
                var UK_Data = JSON.parse(Msg.data);
                if(UK_Data.type!="Process")return ;//如果不是流程处理消息，则跳过

                switch(UK_Data.order)
                {
                    case 0:
                        {
                            s_simnew1.FindPort(0);//发送命令取UK的路径
                        }
                        break;//!!!!!重要提示，如果在调试中，发现代码不对，一定要注意，是不是少了break,这个少了是很常见的错误
                    case 1:
                        {
                            if( UK_Data.LastError!=0){
                                window.alert ( "未发现加密锁，请插入加密锁");s_simnew1.Socket_UK.close();
                                return false;
                            }
                            DevicePath=UK_Data.return_value;//获得返回的UK的路径
                            s_simnew1.GetID_1(DevicePath); //发送命令取ID_1
                        }
                        break;
                    case 2:
                        {
                            if( UK_Data.LastError!=0){
                                window.alert("返回ID号错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();
                                return false;
                            }
                            ID_1=UK_Data.return_value;//获得返回的UK的ID_1
                            s_simnew1.GetID_2(DevicePath); //发送命令取ID_2
                        }
                        break;
                    case 3:
                        {
                            if( UK_Data.LastError!=0){
                                 window.alert("取得ID错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();
                                return false;
                            }
                            ID_2=UK_Data.return_value;//获得返回的UK的ID_2

                            key_id=SoftKeyValidator.toHex(ID_1)+SoftKeyValidator.toHex(ID_2);

                            s_simnew1.ContinueOrder();//为了方便阅读，这里调用了一句继续下一行的计算的命令，因为在这个消息中没有调用我们的函数，所以要调用这个
                        }
                        break;
                    case 4:
                        {
                            //获取设置在锁中的用户名
                            //先从地址0读取字符串的长度,使用默认的读密码"FFFFFFFF","FFFFFFFF"
                            addr=0;
                            s_simnew1.YReadEx(addr,1,"ffffffff","ffffffff",DevicePath);//发送命令取UK地址0的数据
                        }
                        break;
                    case 5:
                        {
                            if( UK_Data.LastError!=0){
                                window.alert("读数据时错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();
                                return false;
                            }
                            s_simnew1.GetBuf(0);//发送命令从数据缓冲区中数据
                        }
                        break;
                    case 6:
                        {
                            if( UK_Data.LastError!=0){
                                window.alert("调用GetBuf时错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();
                                return false;
                            }
                            mylen=UK_Data.return_value;//获得返回的数据缓冲区中数据

                            //再从地址1读取相应的长度的字符串，,使用默认的读密码"FFFFFFFF","FFFFFFFF"
                            addr=1;
                            s_simnew1.YReadString(addr,mylen, "ffffffff", "ffffffff", DevicePath);//发送命令从UK地址1中取字符串
                        }
                        break;
                    case 7:
                        {
                            if( UK_Data.LastError!=0){
                                window.alert("读取字符串时错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();
                                return false;
                            }
                            user_name=UK_Data.return_value;//获得返回的UK地址1的字符串
                            //获到设置在锁中的用户密码,
                            //先从地址20读取字符串的长度,使用默认的读密码"FFFFFFFF","FFFFFFFF"
                            addr=40;
                            s_simnew1.YReadEx(addr,1,"ffffffff","ffffffff",DevicePath);//发送命令取UK地址20的数据
                        }
                        break;
                    case 8:
                        {
                            if( UK_Data.LastError!=0){
                                window.alert("读数据时错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();
                                return false;
                            }
                            s_simnew1.GetBuf(0);//发送命令从数据缓冲区中数据
                        }
                        break;
                    case 9:
                        {
                            if( UK_Data.LastError!=0){
                                window.alert("调用GetBuf时错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();
                                return false;
                            }
                            mylen=UK_Data.return_value;//获得返回的数据缓冲区中数据

                            //再从地址21读取相应的长度的字符串，,使用默认的读密码"FFFFFFFF","FFFFFFFF"
                            addr=41;
                            s_simnew1.YReadString(addr,mylen,"ffffffff", "ffffffff", DevicePath);//发送命令从UK地址21中取字符串
                        }
                        break;
                    case 10:
                        {
                            if( UK_Data.LastError!=0){
                                window.alert("读取字符串时错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();
                                return false;
                            }
                            user_pwd=UK_Data.return_value;//获得返回的UK中地址21的字符串

                            //这里返回对随机数的HASH结果
                            s_simnew1.EncString(rnd,DevicePath);//发送命令让UK进行加密操作
                        }
                        break;
                    case 11:
                        {
                            if( UK_Data.LastError!=0){
                                window.alert("进行加密运行算时错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();
                                return false;
                            }
                            var return_EncData=UK_Data.return_value;//获得返回的加密后的字符串
                            enc_data = return_EncData;

                            s_simnew1.MacAddr();
                        }
                        break;
                    case 12:
                        {
                            if( UK_Data.LastError!=0){
                                window.alert("读取本地mac地址时错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();
                                return false;
                            }
                            localMacAddr=UK_Data.return_value;//获得返回的UK中地址21的字符串

                            addr=80;
                            s_simnew1.YReadEx(addr,1,"ffffffff","ffffffff",DevicePath);//发送命令取UK地址40的数据
                        }
                        break;
                    case 13:
                        {
                            if( UK_Data.LastError!=0){
                                window.alert("读数据时错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();
                                return false;
                            }
                            s_simnew1.GetBuf(0);//发送命令从数据缓冲区中数据
                        }
                        break;
                    case 14:
                        {
                            if( UK_Data.LastError!=0){
                                window.alert("调用GetBuf时错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();
                                return false;
                            }
                            mylen=UK_Data.return_value;//获得返回的数据缓冲区中数据

                            //再从地址41读取相应的长度的字符串，,使用默认的读密码"FFFFFFFF","FFFFFFFF"
                            addr=81;
                            s_simnew1.YReadString(addr,mylen,"ffffffff", "ffffffff", DevicePath);//发送命令从UK地址41中取字符串
                        }
                        break;
                    case 15:
                        {
                            if( UK_Data.LastError!=0){
                                window.alert("读取加密锁mac地址时错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();
                                return false;
                            }
                            macAddr=UK_Data.return_value;//获得返回的UK中地址41的字符串

                             //所有工作处理完成后，关掉Socket
                            s_simnew1.Socket_UK.close();
                            //后台验证
                            checkValidity(func,param,ucode);
                        }
                        break;
                }
            };
            s_simnew1.Socket_UK.onclose = function(){ };

            return true;
        }catch (e){
            alert(e.name + ": " + e.message);
            return false;
        }
    }

    this.Handle_IE10 = function(rnd,func,param,ucode)
    {
        var DevicePath,ret,n,mylen;
        try
        {
            //建立操作我们的锁的控件对象，用于操作我们的锁
            var s_simnew1;
            //创建控件
            s_simnew1=new ActiveXObject("Syunew3A.s_simnew3");

            //查找是否存在锁,这里使用了FindPort函数
            DevicePath = s_simnew1.FindPort(0);
            if( s_simnew1.LastError!= 0 )
            {
                window.alert ( "未发现加密锁，请插入加密锁。");
                return false;
            }

             //'读取锁的ID
            key_id=SoftKeyValidator.toHex(s_simnew1.GetID_1(DevicePath))+SoftKeyValidator.toHex(s_simnew1.GetID_2(DevicePath));

            if( s_simnew1.LastError!= 0 )
            {
                window.alert( "返回ID号错误，错误码为："+s_simnew1.LastError.toString());
                return false;
            }

            //获取设置在锁中的用户名
            //先从地址0读取字符串的长度,使用默认的读密码"FFFFFFFF","FFFFFFFF"
            ret=s_simnew1.YReadEx(0,1,"ffffffff","ffffffff",DevicePath);
            mylen =s_simnew1.GetBuf(0);
            //再从地址1读取相应的长度的字符串，,使用默认的读密码"FFFFFFFF","FFFFFFFF"
            user_name=s_simnew1.YReadString(1,mylen, "ffffffff", "ffffffff", DevicePath);

            if( s_simnew1.LastError!= 0 )
            {
                window.alert("读取用户名时错误，错误码为："+s_simnew1.LastError.toString());
                return false;
            }

            //获到设置在锁中的用户密码,
            //先从地址20读取字符串的长度,使用默认的读密码"FFFFFFFF","FFFFFFFF"
            ret=s_simnew1.YReadEx(40,1,"ffffffff","ffffffff",DevicePath);
            mylen =s_simnew1.GetBuf(0);
            //再从地址21读取相应的长度的字符串，,使用默认的读密码"FFFFFFFF","FFFFFFFF"
            user_pwd=s_simnew1.YReadString(41,mylen,"ffffffff", "ffffffff", DevicePath);

            if( s_simnew1.LastError!= 0 )
            {
                window.alert( "读取用户密码时错误，错误码为："+s_simnew1.LastError.toString());
                return false;
            }

            //这里返回对随机数的HASH结果
            enc_data=s_simnew1.EncString(rnd,DevicePath);
            if( s_simnew1.LastError!= 0 )
            {
                window.alert( "进行加密运行算时错误，错误码为："+s_simnew1.LastError.toString());
                return false;
            }

            //先从地址40读取字符串的长度,使用默认的读密码"FFFFFFFF","FFFFFFFF"
            ret=s_simnew1.YReadEx(80,1,"ffffffff","ffffffff",DevicePath);
            mylen =s_simnew1.GetBuf(0);
            //再从地址41读取相应的长度的字符串，,使用默认的读密码"FFFFFFFF","FFFFFFFF"
            macAddr=s_simnew1.YReadString(81,mylen,"ffffffff", "ffffffff", DevicePath);
            if( s_simnew1.LastError!= 0 )
            {
                window.alert( "读取用户mac时错误，错误码为："+s_simnew1.LastError.toString());
                return false;
            }

            //后台验证
            checkValidity(func,param,ucode);
        }catch (e){
            alert(e.name + "：" + e.message+"，可能是没有安装相应的控件或插件");
            return false;
        }
    }

    String.prototype.trim = function() {
        return this.replace(/^\s+|\s+$/g,"");
    }

    function checkValidity(func,param,ucode){
        var codestr = $.md5(ucode.trim());
        if(codestr.trim()!=user_name.trim()){
            alert("加密锁与当前用户不符！");
            return false;
        }

        var jsonStr = {
            keyId:key_id,
            userName:user_name,
            userPwd:user_pwd,
            rnd:rnd,
            encData:enc_data,
        };

        var data = {
            call:call,
            jsonStr: JSON.stringify(jsonStr)
        };

        $.ajax({
            url:check_url,
            type: "POST",
            data: data,
            dataType : 'jsonp',
            jsonpCallback:"callBack",
            cache: false,
            success: function(result){
                var succ = result.success.replace(/\"/g,"");
                if(succ == '1'){
                    alert('加密锁未启用');
                    return false;
                }else if(succ == '2'){
                    if(param){
                        param += "&key_state="+succ;

                        func(param);
                    }else{
                        func();
                    }
                }else if(succ == '3'){
                    alert('加密锁已冻结');
                    return false;
                }else if(succ == '4'){
                    alert('加密锁已失效');
                    return false;
                }else if(succ == '5'){
                    alert('加密锁已过期');
                    return false;
                }else if(succ == '6'){
                    alert('加密锁验授权信息错误');
                    return false;
                }else{
                    alert("请求错误，验证失败");
                    return false;
                }
            }
        });
        function callBack(){}
    }

     /* this.authorized= function(){
        //如果是IE10及以下浏览器，则使用AVCTIVEX控件的方式
        if(navigator.userAgent.indexOf("MSIE")>0 && !navigator.userAgent.indexOf("opera") > -1) return Handle_IE10_1();

        //判断是否安装了服务程序，如果没有安装提示用户安装
        if(bConnect==0)
        {
            window.alert ( "未能连接服务程序，请确定服务程序是否安装。");return false;
        }
        var DevicePath,ret,n,mylen,addr;
        try
        {
            //由于是使用事件消息的方式与服务程序进行通讯，
            //好处是不用安装插件，不分系统及版本，控件也不会被拦截，同时安装服务程序后，可以立即使用，不用重启浏览器
            //不好的地方，就是但写代码会复杂一些
            var s_simnew1=new SoftKey3W(); //创建UK类

            s_simnew1.Socket_UK.onopen = function() {
               s_simnew1.ResetOrder();//这里调用ResetOrder将计数清零，这样，消息处理处就会收到0序号的消息，通过计数及序号的方式，从而生产流程
            };


             //写代码时一定要注意，每调用我们的一个UKEY函数，就会生产一个计数，即增加一个序号，较好的逻辑是一个序号的消息处理中，只调用我们一个UKEY的函数
            s_simnew1.Socket_UK.onmessage =function got_packet(Msg){
                var UK_Data = JSON.parse(Msg.data);

                if(UK_Data.type!="Process")return ;//如果不是流程处理消息，则跳过
                switch(UK_Data.order){
                    case 0:
                        {
                            s_simnew1.FindPort(0);//发送命令取UK的路径
                        }
                        break;//!!!!!重要提示，如果在调试中，发现代码不对，一定要注意，是不是少了break,这个少了是很常见的错误
                    case 1:
                        {
                            if( UK_Data.LastError!=0){window.alert ( "未发现加密锁，请插入加密锁");s_simnew1.Socket_UK.close();return false;}
                            DevicePath=UK_Data.return_value;//获得返回的UK的路径

                           s_simnew1.MacAddr();
                        }
                        break;
                    case 2:
                        {
                            if( UK_Data.LastError!=0){ window.alert("读取用户信息失败。错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();return false;}
                            localMacAddr =UK_Data.return_value;
                            //写用户mac
                            //写入用户mac到地址41，使用默认的写密码"FFFFFFFF","FFFFFFFF"
                            addr=41;
                            s_simnew1.YWriteString(localMacAddr, addr, "ffffffff", "ffffffff", DevicePath);
                        }
                        break;
                    case 3:
                        {
                            if( UK_Data.LastError!=0){ window.alert("用户绑定失败。错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();return false;}
                            mylen = UK_Data.return_value;

                            s_simnew1.SetBuf(mylen, 0);//设置要字符串的长度到缓冲区中，
                        }
                        break;
                    case 4:
                        {
                            if( UK_Data.LastError!=0){ window.alert("调用SetBuf时错误，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();return false;}
                            //写入用户名mac的字符串长度到地址40，使用默认的写密码"FFFFFFFF","FFFFFFFF"
                            addr=40;
                            s_simnew1.YWriteEx(addr, 1, "ffffffff", "ffffffff",DevicePath);
                        }
                        break;
                    case 5:
                        {
                            if( UK_Data.LastError!=0){ window.alert("用户绑定失败，错误码为："+UK_Data.LastError.toString());s_simnew1.Socket_UK.close();return false;}

                             window.alert ( "绑定成功");
                             //所有工作处理完成后，关掉Socket
                             s_simnew1.Socket_UK.close();
                        }
                        break;
                    }
             };

             s_simnew1.Socket_UK.onclose = function(){

             };
             return true;
        }catch(e){
            alert(e.name + ": " + e.message);
            return false;
        }
    }*/

    //  this.Handle_IE10_1 = function()
    // {
    //     var DevicePath,ret,n,mylen;;
    //     try
    //     {
    //         //建立操作我们的锁的控件对象，用于操作我们的锁
    //         var s_simnew1;
    //         //创建控件
    //         s_simnew1=new ActiveXObject("Syunew3A.s_simnew3");
    //
    //         //查找是否存在锁,这里使用了FindPort函数
    //         DevicePath = s_simnew1.FindPort(0);
    //         if( s_simnew1.LastError!= 0 )
    //         {
    //             window.alert ( "未发现加密锁，请插入加密锁。");
    //             return false;
    //         }
    //
    //         //这里返回用户mac地址
    //         macAddr = s_simnew1.MacAddr();
    //         if( s_simnew1.LastError!= 0 )
    //         {
    //             window.alert( "读取mac地址时错误，错误码为："+s_simnew1.LastError.toString());
    //             return false;
    //         }
    //
    //         //写入用户mac到地址41，使用默认的写密码"FFFFFFFF","FFFFFFFF"
		//     mylen = s_simnew1.YWriteString(macAddr, 41, "ffffffff", "ffffffff", DevicePath);
		//     if( s_simnew1.LastError!= 0 )
		//     {
		// 	    window.alert ( "绑定用户mac失败。错误码是："+s_simnew1.LastError.toString());return false;
		//     }
		//     s_simnew1.SetBuf( mylen, 0);
		//     //写入用户mac的字符串长度到地址40，使用默认的写密码"FFFFFFFF","FFFFFFFF"
		//     ret = s_simnew1.YWrite(40, 1, "ffffffff", "ffffffff",DevicePath);
		//     if( ret != 0 )
		//     {
		// 	    window.alert ( "绑定用户mac失败。错误码是："+s_simnew1.LastError.toString());return false;
		//     }
    //
    //         window.alert ( "绑定成功");
    //         return true;
    //     }catch(e){
    //         alert(e.name + ": " + e.message);
    //         return false;
    //     }
    // }
}
