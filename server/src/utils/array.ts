export function splitByCondition<T>(
    array: T[],
    condition: (item: T) => boolean,
): [T[], T[]] {
    return array.reduce(
        ([trueArr, falseArr], item) => {
            if (condition(item)) {
                trueArr.push(item);
            } else {
                falseArr.push(item);
            }
            return [trueArr, falseArr];
        },
        [[], []] as [T[], T[]],
    );
}