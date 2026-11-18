package com.filo.common;
import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
@Configuration
public class TimeConfiguration {
 @Bean Clock bookingClock(){return Clock.system(ZoneId.of("America/Argentina/Buenos_Aires"));}
}
