#include <math.h>

double rfx_exp(double x)
{
    double P;
    double Frac;
    double I;
    double L;
    Frac = x;
    P = (1.0 + x);
    I = 1.0;

    do
    {
        I++;
        Frac *= (x / I);
        L = P;
        P += Frac;
    } while(L != P);

    return P;
}

double rfx_pow(double x, double y)
{
    return rfx_exp(y * rfx_log(x, E));
}
