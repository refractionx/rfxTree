#include <complex.h>
#include <math.h>

rfx_complex rfx_cexp(rfx_complex x) {
  rfx_complex result;
  result.real = rfx_pow(E, rfx_creal(x)) * rfx_cos(rfx_cimag(x));
  result.imag = rfx_pow(E, rfx_creal(x)) * rfx_sin(rfx_cimag(x));
  return result;
}


double rfx_creal(rfx_complex x) {
  return x.real;
}
double rfx_cimag(rfx_complex x) {
  return x.imag;
}

rfx_complex rfx_add_complex(rfx_complex x, rfx_complex y) {
  rfx_complex result;
  result.real = x.real + y.real;
  result.imag = x.imag + y.imag;
  return result;
}
