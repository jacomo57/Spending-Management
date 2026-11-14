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
Expect 'A deletes own month' (Call Delete "users/$ua/months/2026-11" $ta) 200
Expect 'A deletes own settings' (Call Delete "users/$ua/data/settings" $ta) 200
Expect 'A deletes own profile' (Call Delete "users/$ua" $ta) 200
Expect 'A reads own settings after deleting profile' (Call Get "users/$ua/data/settings" $ta) 403
Expect 'B deletes own profile' (Call Delete "users/$ub" $tb) 200
foreach ($t in $ta, $tb) { Invoke-RestMethod -Method Post -Uri "$auth/accounts:delete?key=demo" -ContentType 'application/json' -Body (@{ idToken = $t } | ConvertTo-Json) | Out-Null }
"demo accounts deleted. failures: $script:fail"
