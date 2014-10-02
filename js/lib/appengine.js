/** @license
 * RequireJS plugin for async dependency load like JSONP and Google Maps
 * Author: Miller Medeiros
 * Version: 0.1.2 (2014/02/24)
    * Released under the MIT license
    */
define(function(){

    var _uid = 0;

    function injectScript(src){
        var s, t;
        s = document.createElement('script'); s.type = 'text/javascript'; s.async = true; s.src = src;
        t = document.getElementsByTagName('script')[0]; t.parentNode.insertBefore(s,t);
    }

    function uid() {
        _uid += 1;
        return '__async_req_'+ _uid +'__';
    }

    return{
        load : function(name, req, onLoad, config){
            //avoid errors on the optimizer
            if(config.isBuild){
                onLoad(null);
            }
            else {
                var id = uid();
                window[id] = function() {
                    gapi.client.load(name, 'v1', function() {
                        onLoad(gapi.client[name]);
                    }, 'https://encryb-notify.appspot.com/_ah/api');
                }
                injectScript("https://apis.google.com/js/client.js?onload=" + id);
            }
        }
    };
});
