# Rule checks against the local emulator only. Throwaway demo accounts, deleted at the end.
$auth = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'
$fs   = 'http://127.0.0.1:8080/v1/projects/demo-spend/databases/(default)/documents'
function NewUser($email) {
  $b = @{ email = $email; password = 'Demo-pass-12345'; returnSecureToken = $true } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "$auth/accounts:signUp?key=demo" -ContentType 'application/json' -Body $b
}
function Call($method, $path, $token, $body) {
  $h = @{}
  if ($token) { $h.Authorization = "Bearer $token" }
  try {
    $p = @{ Method = $method; Uri = "$fs/$path"; Headers = $h; UseBasicParsing = $true }
    if ($body) { $p.Body = $body; $p.ContentType = 'application/json' }
    $r = Invoke-WebRequest @p
    return [int]$r.StatusCode
  } catch {
    if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
    return "ERR $($_.Exception.Message)"
  }
}
$script:fail = 0
function Expect($name, $got, $want) {
  $ok = ($got -eq $want)
  if (-not $ok) { $script:fail++ }
  "{0}  {1}  (got {2}, want {3})" -f $(if ($ok) { 'PASS' } else { 'FAIL' }), $name, $got, $want
}
$a = NewUser "rules-a-$(Get-Random)@example.invalid"
$b = NewUser "rules-b-$(Get-Random)@example.invalid"
$ua = $a.localId; $ub = $b.localId; $ta = $a.idToken; $tb = $b.idToken
$doc = '{"fields":{"v":{"integerValue":"1"},"json":{"stringValue":"{}"}}}'
$prof = { param($code) '{"fields":{"invite":{"stringValue":"' + $code + '"},"created":{"integerValue":"1"}}}' }

Expect 'A reads own settings before profile exists' (Call Get "users/$ua/data/settings" $ta) 403
Expect 'A writes own settings before profile exists' (Call Patch "users/$ua/data/settings" $ta $doc) 403
Expect 'A creates profile with a wrong invite code' (Call Patch "users/$ua" $ta (& $prof 'WRONG-CODE')) 403
Expect 'A creates profile with an empty invite code' (Call Patch "users/$ua" $ta (& $prof '')) 403
Expect 'A creates profile with extra fields' (Call Patch "users/$ua" $ta '{"fields":{"invite":{"stringValue":"DEMO-INVITE-1"},"created":{"integerValue":"1"},"admin":{"booleanValue":true}}}') 403
Expect 'A creates profile for B with a valid code' (Call Patch "users/$ub" $ta (& $prof 'DEMO-INVITE-1')) 403
Expect 'A creates own profile with the valid code' (Call Patch "users/$ua" $ta (& $prof 'DEMO-INVITE-1')) 200
Expect 'A changes own profile afterwards' (Call Patch "users/$ua" $ta (& $prof 'DEMO-INVITE-1')) 403
Expect 'A writes own settings' (Call Patch "users/$ua/data/settings" $ta $doc) 200
Expect 'A writes own month' (Call Patch "users/$ua/months/2026-11" $ta $doc) 200
$big = { param($n) '{"fields":{"v":{"integerValue":"1"},"json":{"stringValue":"' + ('x' * $n) + '"}}}' }
Expect 'A writes a data document that is not settings' (Call Patch "users/$ua/data/other" $ta $doc) 403
Expect 'A writes a month with a bad name' (Call Patch "users/$ua/months/2026-11-extra" $ta $doc) 403
Expect 'A writes a month named with letters' (Call Patch "users/$ua/months/anything" $ta $doc) 403
Expect 'A writes the month for rows without a date' (Call Patch "users/$ua/months/none" $ta $doc) 200
Expect 'A writes a month with an extra field' (Call Patch "users/$ua/months/2026-10" $ta '{"fields":{"v":{"integerValue":"1"},"json":{"stringValue":"[]"},"x":{"integerValue":"1"}}}') 403
Expect 'A writes a month with the wrong version' (Call Patch "users/$ua/months/2026-10" $ta '{"fields":{"v":{"integerValue":"2"},"json":{"stringValue":"[]"}}}') 403
Expect 'A writes a month without a version' (Call Patch "users/$ua/months/2026-10" $ta '{"fields":{"json":{"stringValue":"[]"}}}') 403
Expect 'A writes a month whose json is not text' (Call Patch "users/$ua/months/2026-10" $ta '{"fields":{"v":{"integerValue":"1"},"json":{"integerValue":"5"}}}') 403
Expect 'A writes a month that is too big' (Call Patch "users/$ua/months/2026-10" $ta (& $big 900000)) 403
Expect 'A writes settings that are too big' (Call Patch "users/$ua/data/settings" $ta (& $big 900000)) 403
Expect 'A writes a month just under the limit' (Call Patch "users/$ua/months/2026-10" $ta (& $big 899999)) 200
Expect 'A deletes that month' (Call Delete "users/$ua/months/2026-10" $ta) 200
Expect 'A deletes the no-date month' (Call Delete "users/$ua/months/none" $ta) 200
Expect 'A reads own settings' (Call Get "users/$ua/data/settings" $ta) 200
Expect 'A lists own months' (Call Get "users/$ua/months" $ta) 200
Expect 'B (no profile) reads A settings' (Call Get "users/$ua/data/settings" $tb) 403
Expect 'B creates own profile with the valid code' (Call Patch "users/$ub" $tb (& $prof 'DEMO-INVITE-1')) 200
Expect 'B (with profile) reads A settings' (Call Get "users/$ua/data/settings" $tb) 403
Expect 'B lists A months' (Call Get "users/$ua/months" $tb) 403
Expect 'B writes A month' (Call Patch "users/$ua/months/2026-11" $tb $doc) 403
Expect 'B deletes A month' (Call Delete "users/$ua/months/2026-11" $tb) 403
Expect 'B reads A profile' (Call Get "users/$ua" $tb) 403
Expect 'B deletes A profile' (Call Delete "users/$ua" $tb) 403
Expect 'B lists all users' (Call Get "users" $tb) 403
Expect 'A reads the invite code' (Call Get "invites/DEMO-INVITE-1" $ta) 403
Expect 'A lists invite codes' (Call Get "invites" $ta) 403
Expect 'A adds an invite code' (Call Patch "invites/MY-OWN" $ta '{"fields":{}}') 403
Expect 'A deletes the invite code' (Call Delete "invites/DEMO-INVITE-1" $ta) 403
Expect 'Signed-out visitor reads A settings' (Call Get "users/$ua/data/settings" $null) 403
Expect 'Signed-out visitor creates a profile' (Call Patch "users/someone" $null (& $prof 'DEMO-INVITE-1')) 403
# Phone inbox: written without signing in, with the phone key.
$k1 = 'emulator-phone-key-0123456789'; $k2 = 'another-phone-key-0123456789ab'
$key = { param($k) '{"fields":{"key":{"stringValue":"' + $k + '"}}}' }
$item = { param($k, $extra) '{"fields":{"key":{"stringValue":"' + $k + '"},"amt":{"stringValue":"45.00"},"desc":{"stringValue":"Kiosk"}' + $extra + '}}' }
Expect 'Phone adds to A inbox before a key exists' (Call Post "users/$ua/inbox" $null (& $item $k1 '')) 403
Expect 'A saves a phone key that is too short' (Call Patch "users/$ua/data/phone" $ta (& $key 'short')) 403
Expect 'A saves a phone key with an extra field' (Call Patch "users/$ua/data/phone" $ta '{"fields":{"key":{"stringValue":"emulator-phone-key-0123456789"},"x":{"integerValue":"1"}}}') 403
Expect 'B saves a phone key for A' (Call Patch "users/$ua/data/phone" $tb (& $key $k2)) 403
Expect 'A saves a phone key' (Call Patch "users/$ua/data/phone" $ta (& $key $k1)) 200
Expect 'B reads A phone key' (Call Get "users/$ua/data/phone" $tb) 403
Expect 'Signed-out visitor reads A phone key' (Call Get "users/$ua/data/phone" $null) 403
Expect 'Phone adds with the key' (Call Post "users/$ua/inbox" $null (& $item $k1 '')) 200
Expect 'Phone adds with all the fields' (Call Post "users/$ua/inbox" $null (& $item $k1 ',"card":{"stringValue":"Visa"},"date":{"stringValue":"2026-11-16"},"title":{"stringValue":"Kiosk"},"text":{"stringValue":"paid"}')) 200
Expect 'Phone adds a timer press' (Call Post "users/$ua/inbox" $null (& $item $k1 ',"work":{"stringValue":"toggle"},"time":{"stringValue":"09:30:00"}')) 200
Expect 'Phone adds a too-long work text' (Call Post "users/$ua/inbox" $null (& $item $k1 (',"work":{"stringValue":"' + ('x' * 11) + '"}'))) 403
Expect 'Phone adds with a wrong key' (Call Post "users/$ua/inbox" $null (& $item $k2 '')) 403
Expect 'Phone adds without a key' (Call Post "users/$ua/inbox" $null '{"fields":{"amt":{"stringValue":"45"}}}') 403
Expect 'Phone adds with an unknown field' (Call Post "users/$ua/inbox" $null (& $item $k1 ',"json":{"stringValue":"x"}')) 403
Expect 'Phone adds a number where text is expected' (Call Post "users/$ua/inbox" $null '{"fields":{"key":{"stringValue":"emulator-phone-key-0123456789"},"amt":{"doubleValue":45}}}') 403
Expect 'Phone adds a text that is too long' (Call Post "users/$ua/inbox" $null (& $item $k1 (',"text":{"stringValue":"' + ('x' * 501) + '"}'))) 403
Expect 'Phone adds to B inbox with A key' (Call Post "users/$ub/inbox" $null (& $item $k1 '')) 403
Expect 'Phone writes a month with the key' (Call Patch "users/$ua/months/2026-09" $null (& $item $k1 '')) 403
Expect 'Phone lists A inbox' (Call Get "users/$ua/inbox" $null) 403
Expect 'B lists A inbox' (Call Get "users/$ua/inbox" $tb) 403
Expect 'B adds to A inbox with the key while signed in' (Call Post "users/$ua/inbox" $tb (& $item $k1 '')) 200
Expect 'A lists own inbox' (Call Get "users/$ua/inbox" $ta) 200
Expect 'A changes the phone key' (Call Patch "users/$ua/data/phone" $ta (& $key $k2)) 200
Expect 'Phone adds with the old key' (Call Post "users/$ua/inbox" $null (& $item $k1 '')) 403
Expect 'A deletes the phone key' (Call Delete "users/$ua/data/phone" $ta) 200
Expect 'Phone adds after the key is deleted' (Call Post "users/$ua/inbox" $null (& $item $k2 '')) 403
Expect 'A deletes own month' (Call Delete "users/$ua/months/2026-11" $ta) 200
Expect 'A deletes own settings' (Call Delete "users/$ua/data/settings" $ta) 200
Expect 'A saves a phone key again' (Call Patch "users/$ua/data/phone" $ta (& $key $k1)) 200
Expect 'A deletes own profile' (Call Delete "users/$ua" $ta) 200
Expect 'Phone adds with a left-over key after the profile is deleted' (Call Post "users/$ua/inbox" $null (& $item $k1 '')) 403
Expect 'A reads own settings after deleting profile' (Call Get "users/$ua/data/settings" $ta) 403
Expect 'B deletes own profile' (Call Delete "users/$ub" $tb) 200
foreach ($t in $ta, $tb) { Invoke-RestMethod -Method Post -Uri "$auth/accounts:delete?key=demo" -ContentType 'application/json' -Body (@{ idToken = $t } | ConvertTo-Json) | Out-Null }
"demo accounts deleted. failures: $script:fail"
