#include <math.h>


double rfx_sin (double x) {
    int i = 1.0;
    double cur = x;
    double acc = 1.0;
    double fact= 1.0;
    double pow = x;
    while (fabs(acc) > .00000000001 && i < 10000000){
        fact *= ((2.0*i)*(2.0*i+1.0));
        pow *= -1.0 * x*x;
        acc =  pow / fact;
        cur += acc;
        i++;
    }
    return cur;

}
