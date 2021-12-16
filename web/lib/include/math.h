#ifndef MATH_H
#define MATH_H

#if defined(i386) || defined(i486) || \
	defined(intel) || defined(x86) || defined(i86pc) || \
	defined(__alpha) || defined(__osf__)
#define __LITTLE_ENDIAN
#endif

#ifdef __LITTLE_ENDIAN
#define __HI(x) *(1+(int*)&x)
#define __LO(x) *(int*)&x
#define __HIp(x) *(1+(int*)x)
#define __LOp(x) *(int*)x
#else
#define __HI(x) *(int*)&x
#define __LO(x) *(1+(int*)&x)
#define __HIp(x) *(int*)x
#define __LOp(x) *(1+(int*)x)
#endif

enum fdversion {fdlibm_ieee = -1, fdlibm_svid, fdlibm_xopen, fdlibm_posix};
#define _LIB_VERSION_TYPE enum fdversion
#define _LIB_VERSION fdlibm_ieee
#define _IEEE_  fdlibm_ieee

int __ieee754_rem_pio2(double x, double *y);
int __kernel_rem_pio2(double *x, double *y, int e0, int nx, int prec, const int *ipio2);
double scalbn (double x, int n);
double __kernel_cos(double x, double y);
double __kernel_sin(double x, double y, int p);
double __ieee754_sqrt(double x);
double __ieee754_atan2(double y, double x);
double copysign(double x, double y);
double atan(double x);
int isnan(double x);
double floor(double x);

double fmin(double a, double b);
double fmax(double a, double b);
double atan2(double y, double x);
double fabs(double value);
double rfx_sin (double x);
double asin(double x);
double tan(double x);
double rfx_cos(double x);
double rfx_sqrt(double n);
double rfx_pow(double x, double y);
double rfx_log(double x, double base);

#define E 2.71828182845904523536
#define M_PI   3.14159265358979323846264338327950288

#endif
