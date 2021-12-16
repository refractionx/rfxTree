#ifndef __COMPLEX_H
#define __COMPLEX_H
  struct rfx_complex {
    double real;
    double imag;
  };

  typedef struct rfx_complex rfx_complex;

  double rfx_creal(rfx_complex x);
  double rfx_cimag(rfx_complex x);
  rfx_complex rfx_cexp(rfx_complex x);
  rfx_complex rfx_add_complex(rfx_complex x, rfx_complex y);
#endif
