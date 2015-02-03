module("rockerbox_metrics", package.seeall)

function infer_content_type (args)
  if args["img"] or string.sub(ngx.var.uri,-4,-1) == ".gif"  then
    return "image/gif"
  else
    return "text/javascript"
  end
end

function set_content_type (args)
  ngx.header.content_type = infer_content_type(args)
end

function send_pixel_response ()
  if ngx.header.content_type == "image/gif" then
    ngx.say(ngx.location.capture("/empty.gif").body)
  end
end

function redirect_with_debug (debug, url)
  if debug then
    ngx.header.content_type = "text/javascript"
    ngx.say(url)
  else
    ngx.redirect(url)
  end
end

function respond_with_debug (args)
  if args["img"] or string.sub(ngx.var.uri,-4,-1) == ".gif"  then
    ngx.header.content_type = "image/gif"
  else
    ngx.header.content_type = "text/javascript"
    if args["debug"] then
      ngx.say("//debug")
    end
  end


end

function rb_sync_url () 
  -- original url with UID macro to be filled in
  local qs = ngx.var.query_string or ""
  local url = ngx.var.scheme .. "://" .. ngx.var.host .. ngx.var.uri .. "?adnxs_uid=$UID" .. "&" .. qs
  return url
end


function url_as_redir (url)
  return "&redir=" .. ngx.escape_uri(url)
end

function an_seg_add_type (args)
  local content_type = infer_content_type(args)
  if content_type == "image/gif" then
    return ""
  else
    return "&t=1"
  end
end

function an_seg_add (seg, args, url)
  local seg_add = "/seg?add=" .. seg .. an_seg_add_type(args)
  if url then
    seg_add = seg_add .. url_as_redir(url)
  end
  return seg_add
end


function an_get_uid (url)
  return "/getuid?" .. ngx.escape_uri(url)
end


function an_base ()
  if ngx.var.scheme == "https" then
    return "https://secure.adnxs.com"
  else
    return "http://ib.adnxs.com"
  end
end


function sync_url (url)
  return an_base() .. an_get_uid(url)
end

function uid_cookie_sync (args) 
  local url = rb_sync_url()

  if args["an_seg"] ~= nil then
    url = an_seg_add(args["an_seg"], args, url)
  end 
  
  redirect_with_debug(args["debug"], sync_url(url))

end

function set_uid(args)
  if args["adnxs_uid"] and tonumber(args["adnxs_uid"]) ~= nil then
    ngx.header['Set-Cookie'] = 'uuid=' .. args["adnxs_uid"] .. '; path=/;Max-Age=2592000;'
  end
end

function get_uid (args)
  local uuid = ngx.var.cookie_uuid
  if uuid == nil and args["adnxs_uid"] == nil then
    uid_cookie_sync(args)
  end
end

function set_seg (args)
  if args["an_seg"] ~= nil then
    local url = an_base() .. an_seg_add(args["an_seg"], args)
    if args["adnxs_uid"] == nil then
      redirect_with_debug(args["debug"], url)
    end
  else
    respond_with_debug(args)
  end
 
end
