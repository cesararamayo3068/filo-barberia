package com.filo.appointment;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api")
public class AppointmentController {
 private final AppointmentService service;
 public AppointmentController(AppointmentService service){this.service=service;}
 @GetMapping("/appointments") public List<AppointmentService.View> range(@RequestParam LocalDate from,@RequestParam LocalDate to){return service.range(from,to);}
 @GetMapping("/clients/{id}/appointments") public List<AppointmentService.View> history(@PathVariable Long id){return service.history(id);}
 @PostMapping("/appointments") public AppointmentService.View create(@Valid @RequestBody AppointmentService.Input i){return service.create(i);}
 @PutMapping("/appointments/{id}") public AppointmentService.View update(@PathVariable Long id,@Valid @RequestBody AppointmentService.Input i){return service.update(id,i);}
}
