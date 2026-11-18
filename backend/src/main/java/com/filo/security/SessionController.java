package com.filo.security;
import java.security.Principal;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.web.csrf.CsrfToken;
@RestController @RequestMapping("/api")
public class SessionController {
 @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token){return Map.of("token",token.getToken());}
 @GetMapping("/session") public Map<String,String> session(Principal principal){return Map.of("username",principal.getName());}
}
