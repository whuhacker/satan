define( [
  'jquery'
], function(
  $
) {
    'use strict';

return [ '$http','$q','$rootScope', '$log','$window', function ( $http, $q, $rootScope, $log, $window ) {

    var global = {
        authResult : {},
        defer : $q.defer(),
        account : '',
        currentDevice : {},

        //标记是否要强制显示设备列表，比如只有一个设备的时候，不自动进入。主要给url从/devices进入时使用。
        forceShowDevices : false,

        //标记是否本次登陆了，用于检测是否是跳转过来的用户
        isLogin : false
    };

    var result = {
        ready : function(){
            return global.defer.promise;
        },

        //取得或者设置authResult
        authResult : function (data) {
            var me = this;
            if(!!data) {
                me.setStorageItem('googleToken', data['access_token']);
                global.authResult = data;
            }else{
                if(!global.authResult['access_token']){
                    global.authResult['access_token'] = me.getStorageItem('googleToken');
                }
                return global.authResult;
            }
        },

        //取得或者设置currentDevice
        currentDevice : function (data) {
            var me = this;
            if(!data){
                return global.currentDevice;
            }else{
                global.currentDevice = data;
                me.setStorageItem('currentDevice', JSON.stringify(data));
            }
        },

        //刷新Google token
        refreshToken : function ( immediate ) {
            var defer = $q.defer();
            if(typeof immediate === 'undefined') {
                immediate = false;
            }else{
                immediate = true;
            }
            var me = this;
            $window.gapi.auth.authorize({
               'client_id':'592459906195-7sjc6v1cg6kf46vdhdvn8g2pvjbdn5ae.apps.googleusercontent.com',
               'immediate':immediate,
               'scope':'https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/userinfo.email'
            },function(data){
                me.callDevicesAccountData(data);
                defer.resolve(data);
                $rootScope.$apply();
            });
            return defer.promise;
        },

        getAccount : function () {
            var defer = $q.defer();
            var gapi = $window.gapi;
            if(!global.account){
                var authResult = global.authResult;
                gapi.auth.setToken(authResult);
                gapi.client.load('oauth2', 'v2', function() {
                    var request = gapi.client.oauth2.userinfo.get();
                    request.execute(function(obj){
                        global.account = obj['email'];
                        defer.resolve(global.account);
                        $rootScope.$apply();
                    });
                });
            }else{
                defer.resolve(global.account);
            }
            return defer.promise;
        },

        getDevices : function () {
            $log.log('connecting for geting devices...');
            // Successfully authorized
            var authResult = this.authResult();
            var defer = $q.defer();
            var me = this;

            //调用服务器端接口
            // var url = 'http://192.168.100.24:8081/apppush/limbo?google_token=' + authResult['access_token'];
            var url = 'https://push.snappea.com/apppush/limbo?google_token=' + encodeURIComponent(authResult['access_token']);

            $.ajax({
                type: 'GET',
                url: url,
                async: false,
                contentType: 'application/json',
                dataType: 'jsonp',
                success: function(data) {
                    $log.log('get devices success!',data);
                    defer.resolve(data);
                    global.defer.resolve(data);
                    $rootScope.$apply();
                    global.defer = $q.defer();
                },
                error: function(e) {
                    $log.error('get devices failed');
                    me.refreshToken();
                    defer.reject();
                    $rootScope.$apply();
                    global.defer = $q.defer();
                }
            });

            // $http.jsonp(url).success(function(data){
            //     console.log(123123);
            //     $log.log('get devices success!');
            //     $log.log(data);
            //     defer.resolve(data);
            //     global.defer.resolve(data);
            //     global.defer = $q.defer();
            // }).error(function(e){
            //     $log.error('get devices 403');
            //     me.refreshToken();
            //     defer.reject();
            //     global.defer = $q.defer();
            // });

            return defer.promise;
        },

        callDevicesAccountData : function (authResult) {
            if (authResult && authResult['access_token']) {
                this.authResult(authResult);
                this.getAccount();
                this.getDevices();
            } else if (!authResult || authResult['error']) {
                global.defer.reject();
                global.defer = $q.defer();
            }
        },

        signOut : function () {
            global.defer = $q.defer();
            var defer = $q.defer();
            this.currentDevice({});
            this.removeStorageItem('googleToken');
            var revokeUrl = 'https://accounts.google.com/o/oauth2/revoke?token=' + global.authResult.access_token;
            $.ajax({
                type: 'GET',
                url: revokeUrl,
                async: false,
                contentType: 'application/json',
                dataType: 'jsonp',
                success: function(nullResponse) {
                    // 客户取消了关联，据此执行相应操作
                    // 回应始终为未定义。
                    global.authResult = {};
                    defer.resolve('signOut');
                    $rootScope.$apply();
                },
                error: function(e) {
                  // 处理错误
                  // console.log(e);
                  // 如果失败，您可以引导用户手动取消关联
                  // https://plus.google.com/apps
                }
            });
            return defer.promise;
        },

        //是否本次登陆过，用于检测是否是跳转过来的设备
        getIsLogin : function () {
            return global.isLogin;
        },
        setIsLogin : function () {
            global.isLogin = true;
        },
        setForceShowDevices : function ( flag ) {
            global.forceShowDevices = flag;
        },

        getForceShowDevices : function () {
            return global.forceShowDevices;
        },

        removeStorageItem : function ( name ) {
            $window.localStorage.removeItem( name );
        },

        setStorageItem : function ( name , data ) {
            $window.localStorage.setItem( name , data );
        },

        getStorageItem : function ( name ) {
            return $window.localStorage.getItem( name );
        }
    };

  return result;
}];
});
